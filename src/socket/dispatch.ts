/**
 * Dispatch 事件处理器 - 教师分发
 */

import type { Namespace, Socket } from 'socket.io';
import type { DispatchMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { recordMessage } from '../service/index.js';

/**
 * 处理教师分发事件 (教师 -> 学生/小组)
 */
export function handleDispatch(namespace: Namespace, socket: Socket, payload: DispatchMessage): void {
  // 验证权限：仅教师可分发
  if ((socket as any).type !== 'teacher') {
    throw new Error('仅教师可分发');
  }

  const { to } = payload;

  // 根据目标学号或组号进行分发
  if (to.studentNo?.length) {
    // 发送给指定学生
    to.studentNo.forEach(studentNo => {
      namespace.to(`student:${studentNo}`).emit(EventType.DISPATCH, payload);
    });
  } else if (to.groupNo?.length) {
    // 发送给指定小组
    to.groupNo.forEach(groupNo => {
      namespace.to(`group:${groupNo}`).emit(EventType.DISPATCH, payload);
    });
  } else {
    // 广播给所有学生
    namespace.emit(EventType.DISPATCH, payload);
  }

  // 记录消息
  recordMessage(payload);
  console.log(`[Dispatch] 教师 ${socket.id} 分发成功`);
}

/**
 * 注册 Dispatch 事件监听器
 */
export function registerDispatchEvents(namespace: Namespace, socket: Socket): void {
  socket.on(EventType.DISPATCH, (payload: DispatchMessage) => {
    try {
      handleDispatch(namespace, socket, payload);
    } catch (error: any) {
      console.error('[Dispatch] 处理失败:', error.message);
      socket.emit(EventType.ERROR, { type: 'dispatch_error', message: error.message });
    }
  });
}
