/**
 * 统一类型定义入口
 * 汇总导出所有模块的类型定义
 */

export {
  EventType,
} from './event.js';

export type { 
  BaseMessage,
  SubmitMessage,
  DispatchMessage,
  DiscussMessage,
  ReqMessage,
  AckMessage,
} from './event.js';

export type { UserModel, MessageModel } from './model.js';
