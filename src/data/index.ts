/**
 * 数据访问层统一导出
 * 
 * 提供数据库连接和所有数据访问对象的统一入口
 */

// 数据库连接
export { db } from './connect.js';

// 学生数据访问
export * from './studentDao.js';

// 连接数据访问（包含视图查询和统计功能）
export * from './connectionDao.js';

// 类型定义重新导出（便于外部使用）
export type {
  Student,
  CreateStudentInput,
  UpdateStudentInput
} from './studentDao.js';

export type {
  Connection,
  CreateConnectionInput
} from './connectionDao.js';
