/**
 * 主体（entity）数据访问
 */

import { all, get, run } from './connect.js';
import type { EntityModel } from '../type/index.js';

/**
 * 创建主体
 */
export async function createEntity(input: EntityModel): Promise<EntityModel> {
  const result = await run(
    `INSERT INTO entity (student_no, group_id, role) VALUES (?, ?, ?);`,
    [input.student_no ?? null, input.group_id ?? null, input.role ?? null]
  );
  const row = await get<EntityModel>(`SELECT * FROM entity WHERE id = ?;`, [result.lastID]);
  if (!row) throw new Error('Failed to create entity');
  return row;
}

/**
 * 按主体ID查询
 */
export async function findEntityById(id: number): Promise<EntityModel | undefined> {
  return get<EntityModel>(`SELECT * FROM entity WHERE id = ?;`, [id]);
}

/**
 * 按学号查询主体
 */
export async function findEntityByStudentNo(studentNo: number): Promise<EntityModel | undefined> {
  return get<EntityModel>(`SELECT * FROM entity WHERE student_no = ?;`, [studentNo]);
}

/**
 * 按组号查询主体列表
 */
export async function findEntitiesByGroupId(groupId: number): Promise<EntityModel[]> {
  return all<EntityModel>(`SELECT * FROM entity WHERE group_id = ?;`, [groupId]);
}

/**
 * 按主体ID删除
 */
export async function deleteEntityById(id: number): Promise<boolean> {
  const res = await run(`DELETE FROM entity WHERE id = ?;`, [id]);
  return res.changes > 0;
}

/**
 * 获取主体列表（分页）
 */
export async function listEntities(limit = 100, offset = 0): Promise<EntityModel[]> {
  return all<EntityModel>(`SELECT * FROM entity ORDER BY id DESC LIMIT ? OFFSET ?;`, [limit, offset]);
}

/**
 * 更新主体
 */
export async function updateEntity(id: number, input: EntityModel): Promise<EntityModel> {
  const result = await run(`UPDATE entity SET student_no = ?, group_id = ?, role = ? WHERE id = ?;`, [input.student_no ?? null, input.group_id ?? null, input.role ?? null, id]);
  if (result.changes === 0) throw new Error('Failed to update entity');
  const row = await get<EntityModel>(`SELECT * FROM entity WHERE id = ?;`, [id]);
  if (!row) throw new Error('Failed to update entity');
  return row;
}
