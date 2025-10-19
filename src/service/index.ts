/**
 * 服务层统一导出
 * 提供所有业务服务的统一入口
 */

// 认证服务
// 消息记录服务
export { recordMessage } from './record.js';

// 消息恢复服务
export {
  restoreUserSentMessages,
  restoreUserReceivedMessages,
  restoreTeacherMessages
} from './restore.js';

// 导出恢复服务的类型定义
export type {
  MessageGroup,
  DiscussMessageGroup,
  UserRestoreMessages,
  TeacherRestoreMessages
} from './restore.js';

/**
 * 服务层模块说明：
 * 
 * 1. auth.ts - 用户认证服务
 *    - 处理用户登录逻辑
 *    - 支持多种登录模式（学号、组号、学号+组号、学号+组号+角色）
 *    - 自动更新用户状态和最后登录时间
 * 
 * 2. record.ts - 消息记录服务
 *    - 将 Socket 消息持久化到数据库
 *    - 支持 SUBMIT（学生->教师）、DISPATCH（教师->学生）、DISCUSS（学生<->学生）
 *    - 自动解析消息目标并创建相应的数据库记录
 * 
 * 3. restore.ts - 消息恢复服务
 *    - 查询和恢复历史消息
 *    - 按消息类型分组，每种类型保留最新的一条
 *    - 支持学生和教师的消息恢复
 */
