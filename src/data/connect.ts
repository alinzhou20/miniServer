/**
 * SQLite 数据库客户端
 * 
 * 负责：
 * - 数据库连接初始化
 * - 性能优化配置（WAL模式）
 * - 表结构创建和维护
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// 数据库文件路径，优先使用环境变量，默认为 ./data/mini.db
const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'db', 'mini.db');

/**
 * 确保数据库文件所在目录存在
 * @param {string} filePath - 文件路径
 */
function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * 数据库实例
 * 使用立即执行函数模式初始化，确保单例
 */
export const db = (() => {
  // 确保数据库目录存在
  ensureDirExists(DB_PATH);
  
  // 检查数据库文件是否已存在
  const dbExists = fs.existsSync(DB_PATH);
  
  // 创建数据库连接
  const instance = new Database(DB_PATH);
  
  // 启用 WAL 模式和外键约束（核心配置）
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  
  // 如果数据库文件不存在，则进行初始化
  if (!dbExists) {
    initDatabase(instance);
  }
  
  return instance;
})();

/**
 * 数据库初始化函数
 * 仅在数据库文件不存在时执行，创建所有必要的表结构
 * @param {Database.Database} db - 数据库实例
 */
function initDatabase(db: Database.Database) {
  // 在事务中执行所有表创建，确保原子性
  db.exec('BEGIN');
  try {
    // 创建学生表
    db.exec(`
      CREATE TABLE student (
        id INTEGER PRIMARY KEY,                                    -- 主键ID
        enroll_year INTEGER NOT NULL,                             -- 入学年份
        real_name TEXT,                                           -- 真实姓名（可为空）
        class_seq INTEGER NOT NULL,                                -- 班级号
        student_no INTEGER NOT NULL,                              -- 学号（班级内唯一）
        pin TEXT CHECK(length(pin)=4),                           -- 4位PIN码
        info_awareness REAL NOT NULL DEFAULT 0.0,                -- 维度1：信息意识评分
        computational_thinking REAL NOT NULL DEFAULT 0.0,        -- 维度2：计算思维评分
        digital_learning_innovation REAL NOT NULL DEFAULT 0.0,   -- 维度3：数字化学习创新评分
        social_responsibility REAL NOT NULL DEFAULT 0.0,         -- 维度4：信息社会责任评分
        created_at INTEGER NOT NULL,                              -- 创建时间戳
        updated_at INTEGER NOT NULL,                              -- 更新时间戳
        UNIQUE(enroll_year, class_seq, student_no)               -- 复合唯一约束：入学年份+班级+学号
      );
    `);
        
    // 创建学生查询优化索引
    db.exec(`
      CREATE INDEX student_class_idx ON student(enroll_year, class_seq);
    `);

    // 创建课程表
    db.exec(`
      CREATE TABLE course (
        id INTEGER PRIMARY KEY,                                   -- 主键，自增整数
        title TEXT NOT NULL,                                      -- 课题
        grade INTEGER NOT NULL,                                   -- 年级
        unit INTEGER NOT NULL,                                    -- 单元
        seq INTEGER NOT NULL,                                     -- 课程序号
        is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)), -- 是否为在授课程（0=未在授，1=在授）
        created_at INTEGER NOT NULL,                              -- 创建时间
        updated_at INTEGER NOT NULL                               -- 更新时间
      );
    `);
    
    // 创建课程表索引
    db.exec(`
      CREATE INDEX course_active_idx ON course(is_active);
    `);

    // 创建活动表
    db.exec(`
      CREATE TABLE activity (
        id INTEGER PRIMARY KEY,                                   -- 主键，自增整数
        course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE, -- 归属课程
        seq INTEGER NOT NULL,                                     -- 活动序号
        type INTEGER NOT NULL CHECK(type BETWEEN 0 AND 9),       -- 活动类型（0-9）
        title TEXT NOT NULL,                                      -- 活动标题
        content_json TEXT NOT NULL,                               -- 内容JSON
        created_at INTEGER NOT NULL,                              -- 创建时间
        updated_at INTEGER NOT NULL                               -- 更新时间
      );
    `);
    
    // 创建活动表索引
    db.exec(`
      CREATE INDEX activity_course_idx ON activity(course_id);
    `);

    // 创建评价标准表
    db.exec(`
      CREATE TABLE criterion (
        id INTEGER PRIMARY KEY,                                   -- 主键
        activity_id INTEGER NOT NULL REFERENCES activity(id) ON DELETE CASCADE, -- 归属活动
        name TEXT NOT NULL,                                       -- 标准名称（如"完成度/规范性/创新性"）
        max_score REAL NOT NULL,                                  -- 满分（如100/10）
        weight REAL NOT NULL DEFAULT 1.0,                        -- 权重（汇总加权可用）
        rubric_json TEXT,                                         -- 评分细则/量表（JSON，可选）
        created_at INTEGER NOT NULL,                              -- 创建时间
        updated_at INTEGER NOT NULL                               -- 更新时间
      );
    `);
    
    // 创建评价标准表索引
    db.exec(`
      CREATE INDEX criterion_activity_idx ON criterion(activity_id);
    `);

    // 创建评价记录表
    db.exec(`
      CREATE TABLE evaluation (
        id INTEGER PRIMARY KEY,                                   -- 主键
        criterion_id INTEGER NOT NULL REFERENCES criterion(id) ON DELETE CASCADE, -- 评价标准
        student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,     -- 被评价学生
        score REAL NOT NULL,                                      -- 得分
        feedback TEXT,                                            -- 评语（可选）
        created_at INTEGER NOT NULL,                              -- 创建时间
        updated_at INTEGER NOT NULL,                              -- 更新时间
        UNIQUE(criterion_id, student_id)                          -- 学生×标准唯一约束
      );
    `);
    
    // 创建评价记录表索引
    db.exec(`
      CREATE INDEX evaluation_student_idx ON evaluation(student_id);
    `);

    // 创建在线连接表
    db.exec(`
      CREATE TABLE connection (
        student_id INTEGER PRIMARY KEY REFERENCES student(id) ON DELETE CASCADE, -- 学生ID（主键）
        activity_id INTEGER REFERENCES activity(id) ON DELETE SET NULL,          -- 当前参与的活动ID
        socket_id TEXT NOT NULL UNIQUE,                                          -- Socket.IO 连接ID
        group_no INTEGER NOT NULL,                                               -- 小组号（冗余字段）
        role TEXT NOT NULL DEFAULT 'student',                                   -- 角色（student/teacher）
        connected_at INTEGER NOT NULL,                                           -- 连接建立时间
        last_activity INTEGER NOT NULL                                           -- 最后活动时间
      );
    `);

    // 创建连接表性能优化索引
    db.exec(`
      CREATE INDEX connection_activity_idx ON connection(activity_id);
    `);
    
    db.exec(`
      CREATE INDEX connection_group_idx ON connection(group_no);
    `);
    
    db.exec(`
      CREATE INDEX connection_last_activity_idx ON connection(last_activity);
    `);
    
    // 创建复合索引用于高频查询场景
    db.exec(`
      CREATE INDEX connection_activity_group_idx ON connection(activity_id, group_no);
    `);
    
    db.exec(`
      CREATE INDEX connection_group_student_idx ON connection(group_no, student_id);
    `);

    // 创建连接视图 - 联合查询在线学生详情和活动信息
    db.exec(`
      CREATE VIEW connection_view AS
      SELECT 
          c.student_id,
          c.socket_id,
          c.group_no,
          c.role,
          c.connected_at,
          c.last_activity,
          s.class_seq,
          s.student_no,
          s.real_name,
          a.id as activity_id,
          a.seq as activity_seq,
          a.type as activity_type,
          a.title as activity_title,
          a.content_json as activity_content,
          course.id as course_id,
          course.title as course_title,
          course.grade as course_grade,
          course.unit as course_unit,
          course.seq as course_seq
      FROM connection c
      LEFT JOIN student s ON c.student_id = s.id
      LEFT JOIN activity a ON c.activity_id = a.id
      LEFT JOIN course ON a.course_id = course.id;
    `);

    db.exec('COMMIT');
  } catch (e) {
    // 初始化失败时回滚
    db.exec('ROLLBACK');
    throw e;
  }
}
