/**
 * Socket 连接管理器
 * 负责处理客户端连接、身份验证和房间分配
 */

import { Server, Socket, Namespace } from 'socket.io';
import { registerSubmitEvents } from './submit.js';
import { registerDispatchEvents } from './dispatch.js';
import { registerDiscussEvents } from './discuss.js';
import { registerRequestEvents } from './request.js';
import { EventType } from '../type/index.js';

/**
 * 初始化 Socket.IO 服务
 * @param io - Socket.IO 服务器实例
 */
export function initSocket(io: Server): void {
  const namespace: Namespace = io.of('/classroom');

  namespace.on('connection', async (socket: Socket) => {
    // 从握手认证信息中获取身份类型
    const auth = socket.handshake.auth;
    const type = auth?.type === 'student' ? 'student' : 'teacher';
    
    // 在 socket 实例上存储身份信息
    (socket as any).type = type;
    (socket as any).studentNo = auth?.studentNo;
    (socket as any).groupNo = auth?.groupNo;
    (socket as any).studentRole = auth?.studentRole;

    if (type === 'student') {
      await handleStudentConnection(namespace, socket);
    } else {
      await handleTeacherConnection(namespace, socket);
    }

    // 注册所有事件处理器
    registerEventHandlers(namespace, socket);
  });
}

/**
 * 处理学生连接
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 * @param auth - 认证信息
 */
async function handleStudentConnection(
  namespace: Namespace, 
  socket: Socket
): Promise<void> {
  const { studentNo, groupNo, studentRole } = (socket as any);
  
  // 加入学号房间（用于点对点消息）
  if (studentNo !== undefined && studentNo !== null && studentNo !== '') {
    
    // 踢掉同学号的旧连接
    const existingSockets = await namespace.in(`student:${studentNo}`).fetchSockets();
    for (const existing of existingSockets) {
      existing.disconnect();
    }
    
    socket.join(`student:${studentNo}`);
  }
  
  // 加入小组房间（用于小组消息）
  if (groupNo !== undefined && groupNo !== null && groupNo !== '') {
    socket.join(`group:${groupNo}`);
    
    // 如果有角色，加入角色房间
    if (studentRole !== undefined && studentRole !== null && studentRole !== '') {
      socket.join(`role:${studentRole}`);
    }
  }

  // 加入全体学生房间
  socket.join(`student`);
  
  console.log(`[Socket] 学生连接: ${studentNo || '未知'}${groupNo ? ` (${groupNo}组)` : ''}`);
  
  // 断开连接时的清理
  socket.on('disconnect', () => {
    console.log(`[Socket] 学生断开: ${studentNo || '未知'}`);
    namespace.to('teacher').emit(EventType.SUBMIT, {
      messageType: 'logout',
      from: {
        studentNo,
        groupNo,
        studentRole
      }
    });
  });

  // 提交登录信息
  namespace.to('teacher').emit(EventType.SUBMIT, {
    messageType: 'login',
    from: {
      studentNo,
      groupNo,
      studentRole
    }
  });
}

/**
 * 处理教师连接
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 */
async function handleTeacherConnection(
  namespace: Namespace, 
  socket: Socket
): Promise<void> {
  // 踢掉旧的教师连接
  const existingTeachers = await namespace.in('teacher').fetchSockets();
  for (const existing of existingTeachers) {
    existing.disconnect();
  }
  
  // 加入教师房间
  socket.join('teacher');
  console.log(`[Socket] 教师连接: ${socket.id}`);
  
  // 断开连接时的清理
  socket.on('disconnect', () => {
    console.log(`[Socket] 教师断开: ${socket.id}`);
  });
}

/**
 * 注册所有事件处理器
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 */
function registerEventHandlers(namespace: Namespace, socket: Socket): void {
  registerSubmitEvents(namespace, socket);
  registerDispatchEvents(namespace, socket);
  registerDiscussEvents(namespace, socket);
  registerRequestEvents(namespace, socket);
}
