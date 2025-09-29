/**
 * Submit 事件处理器 - 学生提交
 */

import type { Namespace, Socket } from 'socket.io';
import type { SubmitMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { recordMessage } from '../service/index.js';

/**
 * 处理学生提交事件 (学生 -> 教师)
 */
export function handleSubmit(namespace: Namespace, socket: Socket, payload: SubmitMessage): void {
  // 验证权限：仅学生可提交
  if ((socket as any).type !== 'student') {
    throw new Error('仅学生可提交');
  }

  // 发送给教师
  namespace.to('teacher').emit(EventType.SUBMIT, payload);
  // 记录消息
  recordMessage(payload);
  console.log(`[Submit] 学生 ${socket.id} 提交成功`);
}

/**
 * 注册 Submit 事件监听器
 */
export function registerSubmitEvents(namespace: Namespace, socket: Socket): void {
  socket.on(EventType.SUBMIT, (payload: SubmitMessage) => {
    try {
      handleSubmit(namespace, socket, payload);
    } catch (error: any) {
      console.error('[Submit] 处理失败:', error.message);
      socket.emit(EventType.ERROR, { type: 'submit_error', message: error.message });
    }
  });
}
