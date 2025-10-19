/**
 * 实体相关类型定义
 */

/**
 * 主体实体（可以是学生、小组等）
 */
export interface UserModel {
  id?: number;
  student_no?: number;         // 学号
  group_no?: number;           // 组号
  role?: string;               // 角色
  status?: string;             // 状态
  last_login_at?: number;      // 最后登录时间
}

/**
 * 消息实体
 */
export interface MessageModel {
  id?: number;
  from_no?: number;            // 发送者学号
  to_no?: number;              // 接收者学号
  event_type?: string;         // 事件类型
  message_type?: string;       // 消息类型
  data?: Buffer;               // 消息数据（BLOB）
  created_at?: number;         // 创建时间戳
}

