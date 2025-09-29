/**
 * SQLite 数据库客户端（sqlite3 + Promise 封装）
 *
 * - 初始化数据库
 * - 提供 run/get/all/exec Promise 工具
 * - 创建核心表（含 entity/message）与必要索引
 */

import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// 数据库文件路径，优先使用环境变量，默认为 ./db/mini.db
const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'db', 'mini.db');

function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 导出底层 sqlite3 Database 实例
export const db: sqlite3.Database = (() => {
  ensureDirExists(DB_PATH);
  const instance = new sqlite3.Database(DB_PATH);
  return instance;
})();

// Promise 包装工具
export function exec(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

export function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });
}

export function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve((rows || []) as T[])));
  });
}

// 提供显式初始化函数，由应用启动时调用
export async function initDatabase(): Promise<void> {
  try {
    await exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      PRAGMA synchronous=NORMAL;           -- WAL 模式下推荐，牺牲极少耐久性换取更高写入吞吐
      PRAGMA busy_timeout=5000;            -- 等待锁超时，避免高并发时频繁 SQLITE_BUSY
      PRAGMA wal_autocheckpoint=1000;      -- 1000 页面触发一次 checkpoint，平衡写放大
      PRAGMA temp_store=MEMORY;            -- 临时表/索引驻内存，提升复杂查询性能
      PRAGMA cache_size=-8192;             -- 约 8MB page cache（负数单位为 KB），减轻 IO
    `);

    await exec(`BEGIN;
      CREATE TABLE IF NOT EXISTS entity (
        id INTEGER PRIMARY KEY,                                        -- 主键
        student_no INTEGER UNIQUE,                                     -- 学号（可选但唯一）
        group_id INTEGER,                                              -- 组号
        role INTEGER                                                   -- 组内角色
      );

      CREATE TABLE IF NOT EXISTS message (
        id INTEGER PRIMARY KEY,                                        -- 主键
        from_id INTEGER REFERENCES entity(id) ON DELETE CASCADE,       -- 来源主体ID
        to_id INTEGER REFERENCES entity(id) ON DELETE CASCADE,         -- 目标主体ID
        event_type TEXT NOT NULL,                                      -- 事件类型
        message_type TEXT NOT NULL,                                    -- 消息类型
        activity_index INTEGER NOT NULL,                               -- 活动序号
        data BLOB NOT NULL ,                                           -- 已序列化的二进制数据
        created_at INTEGER NOT NULL                                    -- 时间戳
      );
      
      COMMIT;`);
  } catch (e) {
    try { await exec('ROLLBACK;'); } catch {}
    throw e;
  }
}

