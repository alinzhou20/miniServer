/**
 * 学生数据仓库
 * 
 * 提供学生数据的访问接口：
 * - 学生信息查询
 * - 数据类型定义
 * - 预编译SQL语句优化
 */

import { db } from './connect';

/**
 * 学生数据模型接口
 * 对应数据库中的 student 表结构
 */
export interface Student {
  id: number;                           // 主键ID
  enroll_year: number;                  // 入学年份
  real_name: string | null;             // 真实姓名（可为空）
  class_seq: number;                    // 班级序号
  student_no: number;                   // 学号
  pin: string | null;                   // 4位PIN码（可为空）
  info_awareness: number;               // 信息意识评分
  computational_thinking: number;       // 计算思维评分
  digital_learning_innovation: number;  // 数字化学习创新评分
  social_responsibility: number;        // 社会责任评分
  created_at: number;                   // 创建时间戳
  updated_at: number;                   // 更新时间戳
}

/**
 * 创建学生时的输入数据类型
 * 排除自动生成的字段（id, created_at, updated_at）
 */
export interface CreateStudentInput {
  enroll_year: number;
  real_name: string | null;
  class_seq: number;
  student_no: number;
  pin?: string | null;
  info_awareness?: number;
  computational_thinking?: number;
  digital_learning_innovation?: number;
  social_responsibility?: number;
}

/**
 * 更新学生时的输入数据类型
 * 所有字段都是可选的，只更新提供的字段
 */
export interface UpdateStudentInput {
  enroll_year?: number;
  real_name?: string;
  class_seq?: number;
  student_no?: number;
  pin?: string | null;
  info_awareness?: number;
  computational_thinking?: number;
  digital_learning_innovation?: number;
  social_responsibility?: number;
}

// ==================== 预编译SQL语句 ====================

/**
 * 创建学生的预编译语句
 */
const createStudentStmt = db.prepare<[
  number, string | null, number, number, string | null,
  number, number, number, number, number, number
], { lastInsertRowid: number | bigint }>(
  `INSERT INTO student (
    enroll_year, real_name, class_seq, student_no, pin,
    info_awareness, computational_thinking,
    digital_learning_innovation, social_responsibility, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

/**
 * 根据ID查找学生的预编译语句
 */
const findByIdStmt = db.prepare<[number], Student | undefined>(
  `SELECT * FROM student WHERE id = ?`
);

/**
 * 根据学号查找学生的预编译语句
 */
const findByStudentNoStmt = db.prepare<[number], Student | undefined>(
  `SELECT * FROM student WHERE student_no = ?`
);

/**
 * 查找班级所有学生的预编译语句
 */
const findByClassStmt = db.prepare<[number, number]>(
  `SELECT * FROM student WHERE enroll_year = ? AND class_seq = ? ORDER BY student_no`
);

/**
 * 更新学生信息的预编译语句
 */
const updateStudentStmt = db.prepare<[
  number | undefined, string | undefined, number | undefined, number | undefined,
  string | null | undefined, number | undefined, number | undefined,
  number | undefined, number | undefined, number, number
]>(
  `UPDATE student SET 
    enroll_year = COALESCE(?, enroll_year),
    real_name = COALESCE(?, real_name),
    class_seq = COALESCE(?, class_seq),
    student_no = COALESCE(?, student_no),
    pin = COALESCE(?, pin),
    info_awareness = COALESCE(?, info_awareness),
    computational_thinking = COALESCE(?, computational_thinking),
    digital_learning_innovation = COALESCE(?, digital_learning_innovation),
    social_responsibility = COALESCE(?, social_responsibility),
    updated_at = ?
   WHERE id = ?`
);

/**
 * 删除学生的预编译语句
 */
const deleteStudentStmt = db.prepare<[number]>(
  `DELETE FROM student WHERE id = ?`
);


// ==================== 导出函数 ====================

/**
 * 创建新学生
 * @param {CreateStudentInput} input - 学生信息
 * @returns {Student} 创建的学生信息
 */
export function createStudent(input: CreateStudentInput): Student {
  const now = Date.now();
  const result = createStudentStmt.run(
    input.enroll_year,
    input.real_name ?? null,
    input.class_seq,
    input.student_no,
    input.pin ?? null,
    input.info_awareness ?? 0.0,
    input.computational_thinking ?? 0.0,
    input.digital_learning_innovation ?? 0.0,
    input.social_responsibility ?? 0.0,
    now,
    now
  );
  
  const studentId = typeof result.lastInsertRowid === 'bigint' 
    ? Number(result.lastInsertRowid) 
    : result.lastInsertRowid;
  const student = findByIdStmt.get(studentId);
  if (!student) throw new Error('Failed to create student');
  return student;
}

/**
 * 根据ID查找学生
 * @param {number} id - 学生ID
 * @returns {Student | undefined} 学生信息或undefined（未找到）
 */
export function findById(id: number): Student | undefined {
  return findByIdStmt.get(id);
}

/**
 * 根据学号查找学生
 * @param {number} studentNo - 学号
 * @returns {Student | undefined} 学生信息或undefined（未找到）
 */
export function findByStudentNo(studentNo: number): Student | undefined {
  return findByStudentNoStmt.get(studentNo);
}



/**
 * 查找班级所有学生
 * @param {number} enrollYear - 入学年份
 * @param {number} classSeq - 班级序号
 * @returns {Student[]} 学生列表
 */
export function findByClass(enrollYear: number, classSeq: number): Student[] {
  return findByClassStmt.all(enrollYear, classSeq) as Student[];
}

/**
 * 更新学生信息
 * @param {number} id - 学生ID
 * @param {UpdateStudentInput} input - 要更新的字段
 * @returns {Student | undefined} 更新后的学生信息
 */
export function updateStudent(id: number, input: UpdateStudentInput): Student | undefined {
  const now = Date.now();
  updateStudentStmt.run(
    input.enroll_year,
    input.real_name,
    input.class_seq,
    input.student_no,
    input.pin,
    input.info_awareness,
    input.computational_thinking,
    input.digital_learning_innovation,
    input.social_responsibility,
    now,
    id
  );
  return findByIdStmt.get(id);
}


/**
 * 删除学生
 * @param {number} id - 学生ID
 * @returns {boolean} 是否删除成功
 */
export function deleteStudent(id: number): boolean {
  const result = deleteStudentStmt.run(id);
  return result.changes > 0;
}
