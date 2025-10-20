/**
 * 数据请求事件处理器
 * 处理客户端的请求并直接返回响应
 */

import type { Namespace, Socket } from 'socket.io';
import type { ReqEvent, AckMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { studentLogin, teacherLogin, studentLogout, teacherLogout, updateStudentStatus } from '../service/index.js';

/**
 * 注册请求事件监听器
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 */
export function registerRequestEvents(namespace: Namespace, socket: Socket): void {
  // 使用回调模式处理请求-响应
  socket.on(EventType.REQ, async (payload: ReqEvent, callback: Function) => {
    const { messageType, from, data } = payload;
    const userType = (socket as any).type;
    
    try {
      let responseData = null;
      
      // 根据请求类型处理
      switch (messageType) {

        // 登录
        case 'login':
          if (userType === 'teacher') {
            responseData = await teacherLogin(payload);
          } else {
            responseData = await studentLogin(payload);
            // 学生登录成功后，向教师广播通知
            if (responseData.success) {
              namespace.to('teacher').emit(EventType.SUBMIT, {
                eventType: EventType.SUBMIT,
                messageType: 'login',
                data: responseData.user
              });
            }
          }
          break;
        
        // 登出
        case 'logout':
          if (userType === 'teacher') {
            responseData = await teacherLogout(payload);
          } else {
            responseData = await studentLogout(payload);
            // 学生登出成功后，向教师广播通知
            if (responseData.success) {
              namespace.to('teacher').emit(EventType.SUBMIT, {
                eventType: EventType.SUBMIT,
                messageType: 'logout',
                data: responseData.user
              });
            }
          }
          break;
        
        // 更新状态
        case 'update':
          responseData = await updateStudentStatus(payload);
          // 学生状态更新成功后，向教师广播通知
          if (responseData.success) {
            namespace.to('teacher').emit(EventType.SUBMIT, {
              eventType: EventType.SUBMIT,
              messageType: 'update',
              data: responseData.status
            });
          }
          break;
          
        case 'restore':  
          responseData = { /* TODO: 实现恢复逻辑 */ };
          break;
          
        default:
          throw new Error(`未知请求类型: ${messageType}`);
      }
      
      // 通过回调直接返回成功响应
      const ack: AckMessage = {
        success: true,
        data: responseData,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.log(`[Request] ${userType} <- ${messageType}`);
      
    } catch (error: any) {
      // 通过回调返回错误响应
      const ack: AckMessage = {
        success: false,
        message: error.message,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.error(`[Request] ${userType} 失败:`, error.message);
    }
  });
}
