/**
 * 学生提交事件处理器
 * 负责处理学生向教师提交的消息，如作业、回答等
 */

import type { Namespace, Socket } from 'socket.io';
import type { SubmitMessage, AckMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { recordMessage } from '../service/index.js';

/**
 * 注册提交事件监听器
 * @param namespace - Socket.IO 命名空间
 * @param socket - 客户端 socket 连接
 */
export function registerSubmitEvents(namespace: Namespace, socket: Socket): void {
  // 仅学生需要监听提交事件
  if ((socket as any).type !== 'student') return;
  
  socket.on(EventType.SUBMIT, async (payload: SubmitMessage, callback: Function) => {
    const { studentNo, groupNo } = (socket as any);
    
    try {
      // 转发给教师
      namespace.to('teacher').emit(EventType.SUBMIT, payload);
      
      // 记录消息到数据库
      await recordMessage(payload);
      
      // 通过回调返回确认
      const ack: AckMessage = {
        success: true,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.log(`[Submit] ${studentNo}号学生${groupNo ? `(${groupNo}组)` : ''} -> 教师`);
      
    } catch (error: any) {
      // 通过回调返回错误
      const ack: AckMessage = {
        success: false,
        message: error.message,
        timestamp: Date.now()
      };
      
      if (callback) callback(ack);
      console.error('[Submit] 失败:', error.message);
    }
  });
}
