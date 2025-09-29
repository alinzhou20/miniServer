/**
 * Socket 处理（函数式，单命名空间）
 */

import { Server, Socket, Namespace } from 'socket.io';
import { registerSubmitEvents } from './submit.js';
import { registerDispatchEvents } from './dispatch.js';
import { registerDiscussEvents } from './discuss.js';
import { registerRequestEvents } from './request.js';
import { login } from '../service/index.js';
import { EntityMode, EventType } from '../type/index.js';

// 全局教师 socket 连接
let globalTeacherSocket: Socket | null = null;

/**
 * 初始化 Socket.IO 服务（函数式，无处理类）
 */
export function initSocket(io: Server): void {
  const namespace: Namespace = io.of('/classroom');

  namespace.on('connection', async (socket: Socket) => {
    // 根据 Socket.IO auth 选项决定类型
    const auth = socket.handshake.auth;
    const type = auth?.type === 'student' ? 'student' : 'teacher';
    (socket as any).type = type;

     if (type === 'student') {
      // 设置实体模式
      const mode = auth?.mode;
      const studentNo = auth?.studentNo;
      const groupNo = auth?.groupNo;
      const studentRole = auth?.studentRole;
      // 数据库认证登录
      const entityId = await login(mode, {
        student_no: studentNo,
        group_id: groupNo,
        role: studentRole,  
      });
      (socket as any).entityId = entityId;
       // 加入对应学号的房间（先清理已存在的连接）
       if (studentNo && mode != EntityMode.GROUP) {
         const studentRoomName = `student:${studentNo}`;
         const existingSockets = await namespace.in(studentRoomName).fetchSockets();
         
         // 断开已存在的相同学号连接
         for (const existingSocket of existingSockets) {
           console.log(`[Socket] 断开已存在的学号 ${studentNo} 连接: ${existingSocket.id}`);
           existingSocket.emit(EventType.OFF_LINE, { code: 200, message: '连接已存在，断开旧连接', at: Date.now() });
           existingSocket.disconnect();
         }
         
         (socket as any).studentNo = studentNo;
         socket.join(studentRoomName);
       }

       // 加入对应小组号的房间
       if (groupNo && mode != EntityMode.STUDENT) {
         (socket as any).groupNo = groupNo;
         socket.join(`group:${groupNo}`);

         // 加入对应组内角色的房间（先清理已存在的连接）
         if (studentRole !== undefined && mode == EntityMode.STUDENT_GROUP_ROLE) {
           const roleRoomName = `student:group:${groupNo}:${studentRole}`;
           const existingRoleSockets = await namespace.in(roleRoomName).fetchSockets();
           
           // 断开已存在的同组内角色连接
           for (const existingSocket of existingRoleSockets) {
             console.log(`[Socket] 断开已存在的组${groupNo}角色${studentRole}连接: ${existingSocket.id}`);
             existingSocket.emit('offline', { code: 200, message: '连接已存在，断开旧连接', at: Date.now() });
           }
           
           (socket as any).studentRole = studentRole;
           socket.join(roleRoomName);
         }
       }

      console.log(`[Socket] 学生连接${groupNo ? `: ${groupNo}` : `${studentRole}`}`);
      socket.on('disconnect', () => {
        console.log(`[Socket] 学生断开${groupNo ? `: ${groupNo}` : `${studentRole}`}`);
      });
    } else {
      // 教师连接
      globalTeacherSocket = socket;
      socket.join('teacher'); // 加入教师房间
      console.log(`[Socket] 教师连接: ${socket.id}`);
      socket.on('disconnect', () => {
        globalTeacherSocket = null;
        console.log(`[Socket] 教师断开: ${socket.id}`);
      });
    }

    // 注册所有事件处理器
    registerSubmitEvents(namespace, socket);
    registerDispatchEvents(namespace, socket);
    registerDiscussEvents(namespace, socket);
    registerRequestEvents(namespace, socket);
  });
}
