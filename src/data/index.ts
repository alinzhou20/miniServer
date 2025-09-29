/**
 * 数据访问层统一导出
 * 
 * 提供数据库连接和所有数据访问对象的统一入口
 */

// 数据库连接 & Promise API & 初始化
export { db, run, get, all, exec, initDatabase } from './connect';

// 主体与消息数据访问
export * from './entityDao';
export * from './messageDao';