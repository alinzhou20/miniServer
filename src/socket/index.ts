/**
 * Socket 模块导出
 * 统一导出所有公共接口
 */

export { initSocket } from './handler.js';

// 导出各个事件处理器
export { registerSubmitEvents, handleSubmit } from './submit.js';
export { registerDispatchEvents, handleDispatch } from './dispatch.js';
export { registerDiscussEvents, handleDiscuss } from './discuss.js';
export { registerRequestEvents, handleRequest } from './request.js';
