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

/**
 * 服务层模块说明：
 * 
 * 1. auth.ts - 用户认证服务
 *    - 处理用户登录逻辑
 *    - 支持多种登录模式（学号、组号、学号+组号、学号+组号+角色）
 *    - 自动更新用户状态和最后登录时间
 * 
 * 2. message.ts - 消息服务
 *    - 消息记录：将 Socket 消息持久化到数据库
 *    - 消息恢复：查询和恢复历史消息
 *    - 支持 SUBMIT（学生->教师）、DISPATCH（教师->学生）、DISCUSS（学生<->学生）
 *    - 按消息类型分组，每种类型保留最新的一条
 */
