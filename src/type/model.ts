/**
 * 实体相关类型定义
 */

/**
 * 主体实体（可以是学生、小组等）
 */
export interface EntityModel {
  id?: number;
  student_no?: number;               // 学号（可选但唯一）
  group_id?: number;                 // 组号
  role?: number;                     // 组内角色
}

/**
 * 消息实体
 */
export interface MessageModel {
  id?: number;
  from_id?: number | null;            // 来源ID（null表示教师）
  to_id?: number | null;              // 目标ID（null表示教师）
  event_type?: string;                // 事件类型
  message_type?: string;              // 消息类型
  activity_index?: number;            // 活动序号
  data?: Buffer;                      // 已序列化的二进制数据
  created_at?: number;                // 时间戳
}

