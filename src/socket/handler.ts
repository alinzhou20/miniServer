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
import type { SubmitMessage } from '../type/index.js';
import { encode } from '@msgpack/msgpack';

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

      console.log(`[Socket] 学生连接${groupNo ? `: ${groupNo}组` : ''}${studentRole ? ` ${studentRole}` : ''}`);
      
      // 如果是学生组角色模式，向教师发送登录通知
      if (groupNo && studentNo && studentRole) {
        const loginPayload: SubmitMessage = {
          mode: EntityMode.STUDENT_GROUP_ROLE,
          eventType: EventType.SUBMIT,
          messageType: 'student_login',
          activityIndex: '-1',
          data: encode({
            groupNo: groupNo,
            studentNo: studentNo,
            studentRole: studentRole,
            loginTime: Date.now()
          }),
          from: {
            id: `${studentNo}_${groupNo}`,
            studentNo: studentNo,
            groupNo: groupNo,
            studentRole: studentRole
          },
          to: null
        };
        
        // 向教师发送登录通知
        namespace.to('teacher').emit(EventType.SUBMIT, loginPayload);
        console.log(`[Socket] 已向教师发送学生登录通知: ${groupNo}组 ${studentRole} (${studentNo}号)`);
      }
      
      socket.on('disconnect', () => {
        // 获取学生信息
        const disconnectStudentNo = (socket as any).studentNo;
        const disconnectGroupNo = (socket as any).groupNo;
        const disconnectStudentRole = (socket as any).studentRole;
        
        console.log(`[Socket] 学生断开${disconnectGroupNo ? `: ${disconnectGroupNo}组` : ''}${disconnectStudentRole ? ` ${disconnectStudentRole}` : ''}`);
        
        // 如果是学生组角色模式，向教师发送离线通知
        if (disconnectGroupNo && disconnectStudentNo && disconnectStudentRole) {
          const logoutPayload: SubmitMessage = {
            mode: EntityMode.STUDENT_GROUP_ROLE,
            eventType: EventType.SUBMIT,
            messageType: 'student_logout',
            activityIndex: '-1',
            data: encode({
              groupNo: disconnectGroupNo,
              studentNo: disconnectStudentNo,
              studentRole: disconnectStudentRole,
              logoutTime: Date.now()
            }), 
            from: {
              id: `${disconnectStudentNo}_${disconnectGroupNo}`,
              studentNo: disconnectStudentNo,
              groupNo: disconnectGroupNo,
              studentRole: disconnectStudentRole
            },
            to: null
          };
          
          // 向教师发送离线通知
          namespace.to('teacher').emit(EventType.SUBMIT, logoutPayload);
          console.log(`[Socket] 已向教师发送学生离线通知: ${disconnectGroupNo}组 ${disconnectStudentRole} (${disconnectStudentNo}号)`);
        }
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
