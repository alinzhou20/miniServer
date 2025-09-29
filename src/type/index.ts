/**
 * 统一类型定义入口
 * 汇总导出所有模块的类型定义
 */

export {
  EventType,
  EntityMode,
} from './event.js';

export type { 
  BaseMessage,
  SubmitMessage,
  DispatchMessage,
  DiscussMessage,
  RequestMessage,
  EntityRestoreMessages,
  TeacherRestoreMessages,
} from './event.js';

export type { EntityModel, MessageModel } from './model.js';
