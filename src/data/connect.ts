/**
 * SQLite 数据库连接模块
 * 提供数据库初始化、Promise 封装的执行方法
 */

import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// 数据库文件路径，优先使用环境变量，默认为 ./db/mini.db
const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'db', 'mini.db');

/**
 * 确保目录存在，不存在则递归创建
 */
function ensureDirExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 导出 SQLite3 数据库实例
 */
export const db: sqlite3.Database = (() => {
  ensureDirExists(DB_PATH);
  return new sqlite3.Database(DB_PATH);
})();

/**
 * 执行 SQL 语句（无返回值，用于批量操作）
 * @param sql - SQL 语句
 * @returns Promise<void>
 */
export function exec(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * 执行 INSERT/UPDATE/DELETE 语句
 * @param sql - SQL 语句
 * @param params - 参数数组
 * @returns Promise 包含 lastID 和 changes
 */
export function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * 执行 SELECT 语句，返回单行
 * @param sql - SQL 语句
 * @param params - 参数数组
 * @returns Promise<T | undefined>
 */
export function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });
}

/**
 * 执行 SELECT 语句，返回多行
 * @param sql - SQL 语句
 * @param params - 参数数组
 * @returns Promise<T[]>
 */
export function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve((rows || []) as T[])));
  });
}

/**
 * 初始化数据库
 * 设置 PRAGMA 优化参数、创建表结构
 * @returns Promise<void>
 */
export async function initDatabase(): Promise<void> {
  try {
    // SQLite 性能优化配置
    await exec(`
      PRAGMA journal_mode=WAL;             -- Write-Ahead Logging 模式，提升并发读写性能
      PRAGMA foreign_keys=ON;              -- 启用外键约束
      PRAGMA synchronous=NORMAL;           -- WAL 模式下推荐，平衡性能与耐久性
      PRAGMA busy_timeout=5000;            -- 锁等待超时 5 秒，避免高并发时频繁失败
      PRAGMA wal_autocheckpoint=1000;      -- 每 1000 页触发一次 checkpoint
      PRAGMA temp_store=MEMORY;            -- 临时表存储在内存中
      PRAGMA cache_size=-8192;             -- 约 8MB 缓存（负数表示 KB）
    `);

    console.log('[Database] 数据库初始化成功');
  } catch (e) {
    // 回滚事务
    try { await exec('ROLLBACK;'); } catch {}
    throw e;
  }
}

/**
 * 创建特定表结构
 * @returns Promise<void>
 */
export async function createTable(): Promise<void> {
  try {
    await exec(`
      BEGIN;
      
      -- 用户表
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY,                          -- 主键
        student_no INTEGER UNIQUE NOT NULL,              -- 学号
        group_no INTEGER,                                -- 组号
        role TEXT ,                                      -- 角色
        status TEXT NOT NULL DEFAULT '{}',               -- 状态（JSON）
        last_login_at INTEGER NOT NULL                   -- 时间戳
      );
      -- 消息表
      CREATE TABLE IF NOT EXISTS message (
        id INTEGER PRIMARY KEY,                              -- 主键
        from_no INTEGER NOT NULL,                            -- 发送者学号
        to_no INTEGER NOT NULL,                              -- 接收者学号
        event_type TEXT NOT NULL,                            -- 事件类型
        message_type TEXT NOT NULL,                          -- 消息类型
        data BLOB NOT NULL,                                  -- 消息数据
        created_at INTEGER NOT NULL                          -- 创建时间戳
      );
      
      -- 自动插入教师用户（学号为 0）
      INSERT OR IGNORE INTO user (student_no, group_no, role, status, last_login_at)
      VALUES (0, NULL, 'teacher', '{}', 0);
      
      COMMIT;
    `);
  } catch (e) {
    // 回滚事务
    try { await exec('ROLLBACK;'); } catch {}
    throw e;
  }
}

/**
 * 删除特定表结构
 * @returns Promise<void>
 */
export async function dropTable(): Promise<void> {
  try {
    await exec(`
      BEGIN;
      DROP TABLE IF EXISTS user;
      DROP TABLE IF EXISTS message;
      COMMIT;
    `);
  } catch (e) {
    // 回滚事务
    try { await exec('ROLLBACK;'); } catch {}
    throw e;
  }
}

/**
 * 检查用户和消息表是否存在
 * @returns Promise<boolean>
 */
export async function checkTableExists(): Promise<boolean> {
  try {
    const result = await get<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND (name='user' OR name='message');"
    );
    return !!result;
  } catch {
    return false;
  }
}