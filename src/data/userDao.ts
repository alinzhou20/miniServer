/**
 * 用户实体数据访问层 (DAO)
 * 提供用户实体的 CRUD 操作
 */

import { all, get, run } from './connect.js';
import type { UserModel } from '../type/index.js';

/**
 * 创建用户实体
 * @param input - 用户实体数据
 * @returns 创建后的用户实体（含自增 ID）
 */
export async function createUser(input: UserModel): Promise<UserModel> {
  const result = await run(
    `INSERT INTO user (student_no, group_no, role) VALUES (?, ?, ?);`,
    [input.student_no ?? null, input.group_no ?? null, input.role ?? null]
  );
  const row = await get<UserModel>(`SELECT * FROM user WHERE student_no = ?;`, [result.lastID]);
  if (!row) throw new Error('创建用户失败');
  return row;
}

/**
 * 根据 ID 查询用户实体
 * @param id - 实体 ID
 * @returns 用户实体或 undefined
 */
export async function findUserById(id: number): Promise<UserModel | undefined> {
  return get<UserModel>(`SELECT * FROM user WHERE id = ?;`, [id]);
}

/**
 * 根据学号查询用户实体
 * @param studentNo - 学号
 * @returns 用户实体或 undefined
 */
export async function findUserByStudentNo(studentNo: number): Promise<UserModel | undefined> {
  return get<UserModel>(`SELECT * FROM user WHERE student_no = ?;`, [studentNo]);
}

/**
 * 根据组号查询用户实体列表
 * @param groupNo - 组号
 * @returns 用户实体数组
 */
export async function findUsersByGroupNo(groupNo: number): Promise<UserModel[]> {
  return all<UserModel>(`SELECT * FROM user WHERE group_no = ?;`, [groupNo]);
}

/**
 * 根据角色查询用户实体列表
 * @param role - 角色
 * @returns 用户实体数组
 */
export async function findUsersByRole(role: string): Promise<UserModel[]> {
  return all<UserModel>(`SELECT * FROM user WHERE role = ?;`, [role]);
}

/**
 * 根据状态查询用户实体列表
 * @param status - 状态
 * @returns 用户实体数组
 */
export async function findUsersByStatus(status: string): Promise<UserModel[]> {
  return all<UserModel>(`SELECT * FROM user WHERE status = ?;`, [status]);
}

/**
 * 更新用户实体
 * @param studentNo - 学号
 * @param input - 要更新的字段
 * @returns 更新后的用户实体
 */
export async function updateUser(studentNo: number, input: UserModel): Promise<UserModel> {
  const result = await run(
    `UPDATE user SET student_no = ?, group_no = ?, role = ? WHERE student_no = ?;`,
    [input.student_no ?? null, input.group_no ?? null, input.role ?? null, studentNo]
  );
  if (result.changes === 0) throw new Error('更新用户失败：用户不存在');
  
  const row = await get<UserModel>(`SELECT * FROM user WHERE student_no = ?;`, [studentNo]);
  if (!row) throw new Error('更新用户失败');
  return row;
}


