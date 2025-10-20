/**
 * 服务层统一导出
 * 提供所有业务服务的统一入口
 */

// 认证服务
export { studentLogin, teacherLogin, studentLogout, teacherLogout } from './auth.js';

// 状态服务
export { updateStudentStatus } from './status.js';

// 消息服务（记录和恢复）
export {
  recordMessage,
  restoreUserSentMessages,
  restoreUserReceivedMessages,
  restoreTeacherMessages
} from './message.js';

// 导出消息服务的类型定义
export type {
  MessageGroup,
  DiscussEventGroup,
  UserRestoreMessages,
  TeacherRestoreMessages
} from './message.js';
