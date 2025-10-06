/**
 * Discuss 事件处理器 - 学生讨论
 */

import type { Namespace, Socket } from 'socket.io';
import type { DiscussMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { recordMessage } from '../service/index.js';

/**
 * 处理学生讨论事件 (学生 -> 学生/小组)
 */
export function handleDiscuss(namespace: Namespace, socket: Socket, payload: DiscussMessage): void {
  // 验证权限：仅学生可讨论
  if ((socket as any).type !== 'student') {
    throw new Error('仅学生可讨论');
  }

  const { to } = payload;
  const senderGroupNo = (socket as any).groupNo;
  const mode = (socket as any).mode;

  // 根据目标进行讨论消息分发
  if (to.studentNo?.length) {
    console.log(`[Discuss] 发送给指定学生`)
    // 发送给指定学生
    to.studentNo.forEach(studentNo => {
      namespace.to(`student:${studentNo}`).emit(EventType.DISCUSS, payload);
    });
  } else if (to.groupNo?.length) {
    console.log(`[Discuss] 发送给指定小组`)
    // 发送给指定小组
    to.groupNo.forEach(groupNo => {
      namespace.to(`group:${groupNo}`).emit(EventType.DISCUSS, payload);
    });
  } else {
    console.log(`[Discuss] 广播给所有学生`)
    // 广播给所有学生
    namespace.emit(EventType.DISCUSS, payload);
  }

  // 记录消息
  recordMessage(payload);

  console.log(`[Discuss] 学生 ${socket.id} 讨论成功`);
}

/**
 * 注册 Discuss 事件监听器
 */
export function registerDiscussEvents(namespace: Namespace, socket: Socket): void {
  socket.on(EventType.DISCUSS, (payload: DiscussMessage) => {
    try {
      handleDiscuss(namespace, socket, payload);
    } catch (error: any) {
      console.error('[Discuss] 处理失败:', error.message);
      socket.emit(EventType.ERROR, { type: 'discuss_error', message: error.message });
    }
  });
}
