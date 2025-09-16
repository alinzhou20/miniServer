/**
 * 连接数据仓库
 * 
 * 提供连接数据的访问接口：
 * - 在线连接管理
 * - 连接视图查询
 * - 数据类型定义
 * - 预编译SQL语句优化
 */

import { db } from './connect';

/**
 * 连接数据模型接口
 * 对应数据库中的 connection 表结构
 */
export interface Connection {
  student_id: number;           // 学生ID（主键）
  activity_id: number | null;   // 当前参与的活动ID
  socket_id: string;            // Socket.IO 连接ID
  group_no: number;             // 小组号
  role: string;                 // 角色（student/teacher）
  connected_at: number;         // 连接建立时间戳
  last_activity: number;        // 最后活动时间戳
}

/**
 * 连接视图数据模型接口
 * 对应数据库中的 connection_view 视图结构
 * 包含学生信息、活动信息和课程信息的联合查询结果
 */
export interface ConnectionView {
  student_id: number;
  socket_id: string;
  group_no: number;
  role: string;
  connected_at: number;
  last_activity: number;
  class_seq: number;
  student_no: number;
  real_name: string | null;
  activity_id: number | null;
  activity_seq: number | null;
  activity_type: number | null;
  activity_title: string | null;
  activity_content: string | null;
  course_id: number | null;
  course_title: string | null;
  course_grade: number | null;
  course_unit: number | null;
  course_seq: number | null;
}

/**
 * 创建连接时的输入数据类型
 * 排除自动生成的字段（connected_at, last_activity）
 */
export interface CreateConnectionInput {
  student_id: number;
  activity_id?: number | null;
  socket_id: string;
  group_no: number;
  role?: string;
}

// ==================== 预编译SQL语句 ====================

/**
 * 创建连接的预编译语句
 * 使用 UPSERT 语法，如果学生已存在连接则更新，否则插入新记录
 */
const createConnectionStmt = db.prepare<[
  number, number | null, string, number, string, number, number
], { changes: number }>(
  `INSERT INTO connection (student_id, activity_id, socket_id, group_no, role, connected_at, last_activity) 
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(student_id) DO UPDATE SET
     activity_id = excluded.activity_id,
     socket_id = excluded.socket_id,
     group_no = excluded.group_no,
     role = excluded.role,
     connected_at = excluded.connected_at,
     last_activity = excluded.last_activity`
);

/**
 * 根据学生ID查找连接的预编译语句
 */
const findByStudentIdStmt = db.prepare<[number], Connection | undefined>(
  `SELECT * FROM connection WHERE student_id = ?`
);

/**
 * 根据Socket ID查找连接的预编译语句
 */
const findBySocketIdStmt = db.prepare<[string], Connection | undefined>(
  `SELECT * FROM connection WHERE socket_id = ?`
);

/**
 * 查找所有连接的预编译语句
 */
const findAllConnectionsStmt = db.prepare(
  `SELECT * FROM connection ORDER BY connected_at DESC`
);

/**
 * 根据活动ID查找连接的预编译语句
 */
const findByActivityStmt = db.prepare(
  `SELECT * FROM connection WHERE activity_id = ?`
);

/**
 * 根据小组号查找连接的预编译语句
 */
const findByGroupNoStmt = db.prepare<[number]>(
  `SELECT * FROM connection WHERE group_no = ? ORDER BY connected_at DESC`
);

/**
 * 根据学号查找连接的预编译语句（通过连接视图）
 */
const findByStudentNoStmt = db.prepare<[number]>(
  `SELECT * FROM connection_view WHERE student_no = ? ORDER BY connected_at DESC`
);

/**
 * 更新最后活动时间的预编译语句
 */
const updateLastActivityStmt = db.prepare<[number, number], { changes: number }>(
  `UPDATE connection SET last_activity = ? WHERE student_id = ?`
);

/**
 * 根据学生ID删除连接的预编译语句
 */
const deleteConnectionStmt = db.prepare<[number], { changes: number }>(
  `DELETE FROM connection WHERE student_id = ?`
);

/**
 * 根据Socket ID删除连接的预编译语句
 */
const deleteBySocketStmt = db.prepare<[string], { changes: number }>(
  `DELETE FROM connection WHERE socket_id = ?`
);

/**
 * 查询连接视图的预编译语句
 * 联合查询连接、学生、活动和课程信息
 */
const findConnectionViewStmt = db.prepare(
  `SELECT * FROM connection_view ORDER BY connected_at DESC`
);

/**
 * 根据学生ID查询连接视图的预编译语句
 */
const findConnectionViewByStudentStmt = db.prepare(
  `SELECT * FROM connection_view WHERE student_id = ?`
);

// ==================== 导出函数 ====================

/**
 * 创建新连接
 * 如果学生已有连接，则更新现有连接信息
 * @param {CreateConnectionInput} input - 连接信息
 * @returns {Connection} 创建或更新的连接信息
 */
export function createConnection(input: CreateConnectionInput): Connection {
  const now = Date.now();
  createConnectionStmt.run(
    input.student_id,
    input.activity_id ?? null,
    input.socket_id,
    input.group_no,
    input.role ?? 'student',
    now,
    now
  );
  
  const connection = findByStudentIdStmt.get(input.student_id);
  if (!connection) throw new Error('Failed to create connection');
  return connection;
}

/**
 * 根据学生ID查找连接
 * @param {number} studentId - 学生ID
 * @returns {Connection | undefined} 连接信息或undefined（未找到）
 */
export function findByStudentId(studentId: number): Connection | undefined {
  return findByStudentIdStmt.get(studentId);
}

/**
 * 根据Socket ID查找连接
 * @param {string} socketId - Socket连接ID
 * @returns {Connection | undefined} 连接信息或undefined（未找到）
 */
export function findBySocketId(socketId: string): Connection | undefined {
  return findBySocketIdStmt.get(socketId);
}

/**
 * 查找所有连接
 * @returns {Connection[]} 所有连接列表，按连接时间倒序排列
 */
export function findAllConnections(): Connection[] {
  return findAllConnectionsStmt.all() as Connection[];
}

/**
 * 根据活动ID查找连接
 * @param {number} activityId - 活动ID
 * @returns {Connection[]} 参与该活动的连接列表
 */
export function findByActivity(activityId: number): Connection[] {
  return findByActivityStmt.all(activityId) as Connection[];
}

/**
 * 根据小组号查找连接
 * @param {number} groupNo - 小组号
 * @returns {Connection[]} 该小组的所有连接列表
 */
export function findByGroupNo(groupNo: number): Connection[] {
  return findByGroupNoStmt.all(groupNo) as Connection[];
}

/**
 * 根据学号查找连接（包含详细信息）
 * @param {number} studentNo - 学号
 * @returns {ConnectionView[]} 该学号的连接视图列表（包含学生、活动、课程信息）
 */
export function findByConnectionStudentNo(studentNo: number): ConnectionView[] {
  return findByStudentNoStmt.all(studentNo) as ConnectionView[];
}

/**
 * 更新学生的最后活动时间
 * @param {number} studentId - 学生ID
 * @returns {boolean} 是否更新成功
 */
export function updateLastActivity(studentId: number): boolean {
  const result = updateLastActivityStmt.run(Date.now(), studentId);
  return result.changes > 0;
}

/**
 * 根据学生ID删除连接
 * @param {number} studentId - 学生ID
 * @returns {boolean} 是否删除成功
 */
export function deleteConnection(studentId: number): boolean {
  const result = deleteConnectionStmt.run(studentId);
  return result.changes > 0;
}

/**
 * 根据Socket ID删除连接
 * @param {string} socketId - Socket连接ID
 * @returns {boolean} 是否删除成功
 */
export function deleteBySocketId(socketId: string): boolean {
  const result = deleteBySocketStmt.run(socketId);
  return result.changes > 0;
}

// ==================== 视图查询函数 ====================

/**
 * 查询连接视图（包含学生、活动、课程详细信息）
 * 
 * 此函数查询 connection_view 视图，该视图通过以下方式联合查询：
 * - connection 表：连接基础信息
 * - student 表：学生详细信息（姓名、学号、班级等）
 * - activity 表：活动详细信息（标题、类型、内容等）
 * - course 表：课程详细信息（标题、年级、单元等）
 * 
 * @returns {ConnectionView[]} 包含完整信息的连接视图列表
 */
export function findConnectionView(): ConnectionView[] {
  return findConnectionViewStmt.all() as ConnectionView[];
}

/**
 * 根据学生ID查询连接视图
 * @param {number} studentId - 学生ID
 * @returns {ConnectionView | undefined} 包含完整信息的连接视图或undefined（未找到）
 */
export function findConnectionViewByStudent(studentId: number): ConnectionView | undefined {
  return findConnectionViewByStudentStmt.get(studentId) as ConnectionView | undefined;
}

/**
 * 获取在线连接数量
 * @returns {number} 当前在线连接数
 */
export function getOnlineCount(): number {
  return findAllConnections().length;
}
