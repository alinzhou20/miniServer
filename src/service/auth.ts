/**
 * 认证服务 - 主体身份验证和管理
 */

import { createEntity, findEntityByStudentNo, findEntitiesByGroupId, updateEntity } from '../data/index.js';
import { EntityMode } from '../type/index.js';
import type { EntityModel } from '../type/index.js';

/**
 * 主体登录（根据模式验证并创建或获取主体ID）
 */
export async function login(mode: EntityMode, entity: EntityModel): Promise<number> {
  const studentNo = entity.student_no;
  const groupId = entity.group_id;
  const role = entity.role;

  // 基础验证
  switch (mode) {
    case EntityMode.STUDENT:
      if (!studentNo) throw new Error('STUDENT模式需要学号');
      break;
    case EntityMode.GROUP:
      if (!groupId) throw new Error('GROUP模式需要组号');
      break;
    case EntityMode.STUDENT_GROUP:
      if (!studentNo || !groupId) throw new Error('STUDENT_GROUP模式需要学号和组号');
      break;
    case EntityMode.STUDENT_GROUP_ROLE:
      if (!studentNo || !groupId || role === undefined) throw new Error('STUDENT_GROUP_ROLE模式需要学号、组号和角色');
      break;
    default:
      throw new Error(`不支持的模式: ${mode}`);
  }

  // 查找现有主体
  let existing: EntityModel | undefined;
  
  if (mode === EntityMode.GROUP) {
    // GROUP模式：按小组查找
    const groupEntities = await findEntitiesByGroupId(groupId!);
    existing = groupEntities[0];
  } else {
    // 其他模式：按学号查找
    existing = await findEntityByStudentNo(studentNo!);
  }

  // 更新主体
  if (existing) {
    await updateEntity(existing.id!, entity);
    return existing.id!;
  } 

  // 创建主体 
  const newEntity = await createEntity(entity);
  return newEntity.id!;
}