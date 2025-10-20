/**
 * 数据访问层统一导出
 * 
 * 提供数据库连接和所有数据访问对象的统一入口
 */

// 数据库连接 & Promise API & 初始化 & 管理工具
export { 
  db, run, get, all, exec, initDatabase, dropTable, createTable, checkTableExists,
} from './connect';

export * from './userDao';
export * from './messageDao';