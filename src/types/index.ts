// 极简类型定义
export type UserRole = 'teacher' | 'student';

export interface SimpleUser {
  role: UserRole;
  studentNo?: number;
  groupNo?: number;
  realName?: string;
}