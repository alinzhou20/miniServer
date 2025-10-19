/**
 * 教师分发事件处理器
 * 负责处理教师向学生分发的消息，如任务、通知、资源等
 */

import type { Namespace, Socket } from 'socket.io';
import type { DispatchMessage, AckMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { recordMessage } from '../service/index.js';

/**
 * 注册分发事件监听器
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 */
export function registerDispatchEvents(namespace: Namespace, socket: Socket): void {
  // 仅教师需要监听分发事件
  if ((socket as any).type !== 'teacher') return;
  
  socket.on(EventType.DISPATCH, async (payload: DispatchMessage, callback: Function) => {
    try {
      const { to } = payload;
      let targetInfo = '';
      
      // 根据不同的目标类型进行分发
      if (to.studentNo?.length) {
        // 1. 发送给学生
        to.studentNo.forEach(no => {
          namespace.to(`student:${no}`).emit(EventType.DISPATCH, payload);
        });
        targetInfo = `学生[${to.studentNo.join(', ')}]`;
        
      } else if (to.groupNo?.length) {
        // 2. 发送给小组
        to.groupNo.forEach(no => {
          namespace.to(`group:${no}`).emit(EventType.DISPATCH, payload);
        });
        targetInfo = `小组[${to.groupNo.join(', ')}]`;
        
      } else {
        // 3. 广播给学生
        namespace.emit(EventType.DISPATCH, payload);
        targetInfo = '全体学生';
      }
      
      // 记录消息到数据库
      await recordMessage(payload);
      
      // 通过回调返回确认
      const ack: AckMessage = {
        success: true,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.log(`[Dispatch] 教师 -> ${targetInfo}`);
      
    } catch (error: any) {
      // 通过回调返回错误
      const ack: AckMessage = {
        success: false,
        message: error.message,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.error('[Dispatch] 失败:', error.message);
    }
  });
}