/**
 * 学生讨论事件处理器
 * 负责处理学生之间的讨论消息，支持点对点、小组内、角色间的交流
 */

import type { Namespace, Socket } from 'socket.io';
import type { DiscussEvent, AckMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { recordMessage } from '../service/index.js';

/**
 * 注册讨论事件监听器
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 */
export function registerDiscussEvents(namespace: Namespace, socket: Socket): void {
  // 仅学生需要监听讨论事件
  if ((socket as any).type !== 'student') return;
  
  socket.on(EventType.DISCUSS, async (payload: DiscussEvent, callback: Function) => {
    const { studentNo, groupNo } = (socket as any);
    
    try {
      const { to } = payload;
      let targetInfo = '';
      
      // 根据不同的目标类型进行讨论消息分发
      if (to.studentNo?.length) {
        // 1. 发送给同学
        to.studentNo.forEach(no => {
          namespace.to(`student:${no}`).emit(EventType.DISCUSS, payload);
        });
        targetInfo = `学生[${to.studentNo.join(', ')}]`;
        
      } else if (to.groupNo?.length) {
        // 2. 发送给小组
        to.groupNo.forEach(no => {
          namespace.to(`group:${no}`).emit(EventType.DISCUSS, payload);
        });
        targetInfo = `小组[${to.groupNo.join(', ')}]`;
        
      } else {
        // 3. 广播给同学
        namespace.to(`student`).emit(EventType.DISCUSS, payload);
        targetInfo = `全体同学`;
      }
      
      // 记录消息到数据库
      await recordMessage(payload);
      
      // 通过回调返回确认
      const ack: AckMessage = {
        success: true,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.log(`[Discuss] ${studentNo}号${groupNo ? `(${groupNo}组)` : ''} -> ${targetInfo}`);
      
    } catch (error: any) {
      // 通过回调返回错误
      const ack: AckMessage = {
        success: false,
        message: error.message,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.error('[Discuss] 失败:', error.message);
    }
  });
}
