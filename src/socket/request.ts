/**
 * Submit 事件处理器 - 学生提交
 */

import type { Namespace, Socket } from 'socket.io';
import type { RequestMessage } from '../type/index.js';
import { EventType } from '../type/index.js';
import { entitySendActivitySend, entityActivityReceive, teacherActivityRestore } from '../service/index.js';
/**
 * 处理请求事件 (客户端 -> 服务端)
 * 默认为恢复消息
 */
export function handleRequest(namespace: Namespace, socket: Socket, payload: RequestMessage): void {
  // 路由处理
  const type = (socket as any).type;
  const entityId = (socket as any).entityId;
  const activityIndex = Number(payload.activityIndex);
  let result = null
  if (type == 'student') {
    const sentResult = entitySendActivitySend(entityId, activityIndex);
    const receivedResult = entityActivityReceive(entityId, activityIndex);
    result = {
      sent: sentResult,
      received: receivedResult,
    }
  } else if (type == 'teacher') {
    result = teacherActivityRestore(activityIndex);
  }

  // 发送给自己
  namespace.to(socket.id).emit(EventType.REQUEST, result);
  console.log(`[Request] 客户端 ${socket.id} 请求成功`);
}

/**
 * 注册 Request 事件监听器
 */
export function registerRequestEvents(namespace: Namespace, socket: Socket): void {
  socket.on(EventType.REQUEST, (payload: RequestMessage) => {
    try {
      handleRequest(namespace, socket, payload);
    } catch (error: any) {
      console.error('[Request] 处理失败:', error.message);
      socket.emit(EventType.ERROR, { type: 'request_error', message: error.message });
    }
  });
}
