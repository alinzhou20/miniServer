/**
 * 数据请求事件处理器
 * 处理客户端的请求并直接返回响应
 */

import type { Namespace, Socket } from 'socket.io';
import type { ReqMessage, AckMessage } from '../type/index.js';
import { EventType } from '../type/index.js';

/**
 * 注册请求事件监听器
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 */
export function registerRequestEvents(namespace: Namespace, socket: Socket): void {
  // 使用回调模式处理请求-响应
  socket.on(EventType.REQ, async (payload: ReqMessage, callback: Function) => {
    const { messageType, data } = payload;
    const userType = (socket as any).type;
    const userId = userType === 'student' ? (socket as any).studentNo : 'teacher';
    
    try {
      let responseData = null;
      
      // 根据请求类型处理
      switch (messageType) {
        case 'create':
          responseData = { /* TODO: 实现创建逻辑 */ };
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
      console.log(`[Request] ${userType}(${userId}) <- ${messageType}`);
      
    } catch (error: any) {
      // 通过回调返回错误响应
      const ack: AckMessage = {
        success: false,
        message: error.message,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.error(`[Request] ${userType}(${userId}) 失败:`, error.message);
    }
  });
}
