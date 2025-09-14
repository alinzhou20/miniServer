/**
 * Socket 模块导出
 * 统一导出所有公共接口
 */

export { initSocket, SocketHandler } from './handler.js';
export { SocketEvents, type MessagePayload } from './message.js';
export type { AuthData } from './handler.js';
