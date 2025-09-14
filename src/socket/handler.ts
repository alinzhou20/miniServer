/**
 * Socket 主处理器
 * 初始化 + 握手验证 + 协调逻辑
 */

import { Server, Socket, Namespace } from 'socket.io';
import { Connect, Auth } from '../service';
import { SocketEvents } from './message';

// 全局教师 socket 连接
let globalTeacherSocket: Socket | null = null;

export interface AuthData {
  role: 'teacher' | 'student';
  studentNo: number;
  groupNo: number;
  classNo?: string;
  pin4?: string;
  username?: string;
  password?: string;
}

/**
 * 初始化 Socket.IO 服务
 */
export function initSocket(io: Server): SocketHandler {
  const classroomNamespace = io.of('/classroom');
  
  // 握手验证中间件
  classroomNamespace.use(async (socket, next) => {
    const headers = socket.handshake.headers;
    const auth: AuthData = {
      role: headers.role as 'teacher' | 'student',
      studentNo: Number(headers.student_no),
      groupNo: Number(headers.group_no),
      classNo: headers.class_no as string,
      pin4: headers.pin4 as string,
      username: headers.username as string,
      password: headers.password as string
    };    
    
    const result = await SocketHandler.validateAuth(auth);
    
    if (!result.valid) {
      console.log(`[Socket] 握手验证失败: ${result.message}`);
      return next(new Error(result.message || '认证失败'));
    }
    
    // 将验证结果写入 socket
    (socket as any).role = auth.role;
    if (result.studentId) {
      (socket as any).studentId = result.studentId;
      (socket as any).studentNo = auth.studentNo;
      (socket as any).groupNo = auth.groupNo;
    }
    
    next();
  });
  
  const handler = new SocketHandler(classroomNamespace);
  handler.init();
  
  console.log('[Socket] Socket.IO服务已启动 - /classroom (握手验证已启用)');
  return handler;
}


export class SocketHandler {
  private namespace: Namespace;
  private events: SocketEvents;

  constructor(namespace: Namespace) {
    this.namespace = namespace;
    this.events = new SocketEvents(namespace);
  }

  /**
   * 获取全局教师连接
   */
  static getTeacherSocket(): Socket | null {
    return globalTeacherSocket;
  }

  /**
   * 验证认证信息
   * 
   * 教师认证：username + password (环境变量配置)
   * 学生认证：调用 AuthService 进行数据库验证
   */
  static async validateAuth(auth: AuthData): Promise<{ valid: boolean; studentId?: number; message?: string }> {
    if (!auth?.role ) {
      return { valid: false, message: '缺少角色信息' };
    }
    
    // 教师认证
    if (auth.role === 'teacher') {
      const teacherUsername = process.env.TEACHER_USERNAME || 'admin';
      const teacherPassword = process.env.TEACHER_PASSWORD || 'bgxx2025';
      
      if (!auth.username || !auth.password) {
        return { valid: false, message: '缺少用户名或密码' };
      }
      
      if (auth.username === teacherUsername && auth.password === teacherPassword) {
        return { valid: true };
      }
      
      return { valid: false, message: '用户名或密码错误' };
    }
    
    // 学生认证
    if (auth.role === 'student') {
      if (!auth.classNo || !auth.studentNo || !auth.groupNo ) {
        return { valid: false, message: '学生认证信息不完整' };
      }

      try {
        const result = Auth.authenticate({
          classNo: auth.classNo,
          studentNo: auth.studentNo,
          pin4: auth.pin4,
        });

        if (result.success) {
          return { 
            valid: true, 
            studentId: result.studentId 
          };
        }
        
        return { valid: false, message: result.message || '认证失败' };
      } catch (error) {
        return { valid: false, message: '认证过程中发生错误' };
      }
    }
    
    return { valid: false, message: '未知角色类型' };
  }

  /**
   * 初始化事件处理
   */
  init(): void {
    this.namespace.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('[SocketHandler] Socket事件处理器初始化完成');
  }

  /**
   * 处理连接事件
   */
  private handleConnection(socket: Socket): void {

    if ((socket as any).role === 'teacher') {
      this.handleTeacherConnection(socket);
    } else if ((socket as any).role === 'student') {
      this.handleStudentConnection(socket);
    }
    
    // 注册事件监听器
    this.events.registerEvents(socket);
  }

  /**
   * 处理教师连接
   */
  private handleTeacherConnection(socket: Socket): void {
    // 存储全局教师连接
    globalTeacherSocket = socket;
    
    // 加入教师房间
    socket.join('teacher');

    // 处理教师断开连接
    socket.on('disconnect', () => {
      globalTeacherSocket = null;
      console.log(`[SocketHandler] 教师断开连接: ${socket.id}`);
    });
  }

  /**
   * 处理学生连接
   */
  private handleStudentConnection(socket: Socket): void {
    const studentId = (socket as any).studentId; // 从握手验证中获取
    const groupNo = (socket as any).groupNo;
    const studentNo = (socket as any).studentNo;
    
    try {
      Connect.createStudentConnection({
        studentId,
        socketId: socket.id,
        groupNo
      });

      // 加入房间
      socket.join('student');
      if (studentNo) socket.join(`student:${studentNo}`);
      if (groupNo) socket.join(`group:${groupNo}`);
      
      // 发送认证成功消息
      console.log(`[SocketHandler] 学生认证成功: ${socket.id}`);
      if (globalTeacherSocket) {
        globalTeacherSocket.emit('student_online', {
          studentNo,
          socketId: socket.id,
          timestamp: Date.now()
        });
      }

      // 处理学生断开连接
      socket.on('disconnect', () => {
        Connect.removeConnection(socket.id);
        if (globalTeacherSocket) {
          globalTeacherSocket.emit('student_offline', {
            studentNo,
            socketId: socket.id,
            timestamp: Date.now()
          });
        }
      });

    } catch (error) {
      console.error(`[SocketHandler] 学生连接处理失败: ${socket.id}`, error);
      socket.disconnect();
    }
  }
}
