/**
 * 消息数据访问层 (DAO)
 * 提供消息的创建和条件查询功能
 */

import { all, get, run } from './connect.js';
import type { MessageModel } from '../type/index.js';

/**
 * 创建消息记录
 * @param input - 消息数据
 * @returns 创建后的消息（含自增 ID）
 */
export async function createMessage(input: MessageModel): Promise<MessageModel> {
  // 将 undefined 转换为 null 以存储到数据库
  const result = await run(
    `INSERT INTO message (from_no, to_no, event_type, message_type, data, created_at) 
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      input.from_no !== undefined ? input.from_no : null,
      input.to_no !== undefined ? input.to_no : null,
      input.event_type,
      input.message_type,
      input.data,
      input.created_at ?? Date.now()
    ]
  );
  
  const row = await get<MessageModel>(`SELECT * FROM message WHERE id = ?;`, [result.lastID]);
  if (!row) throw new Error('创建消息失败');
  return row;
}

/**
 * 根据组合条件查询消息
 * 支持按 from_no、to_no、event_type、message_type 等字段灵活组合查询
 * @param condition - 查询条件（支持 null 值精确匹配）
 * @returns 符合条件的消息数组（按创建时间倒序）
 */
export async function getMessagesByCondition(condition: Partial<MessageModel>): Promise<MessageModel[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  
  // 动态构建 WHERE 条件
  if (condition.id !== undefined) {
    conditions.push('id = ?');
    params.push(condition.id);
  }
  
  // from_no 支持 undefined 和 null 的查询
  if ('from_no' in condition) {
    if (condition.from_no === undefined || condition.from_no === null) {
      conditions.push('from_no IS NULL');
    } else {
      conditions.push('from_no = ?');
      params.push(condition.from_no);
    }
  }
  
  // to_no 支持 undefined 和 null 的查询
  if ('to_no' in condition) {
    if (condition.to_no === undefined || condition.to_no === null) {
      conditions.push('to_no IS NULL');
    } else {
      conditions.push('to_no = ?');
      params.push(condition.to_no);
    }
  }
  
  if (condition.event_type !== undefined) {
    conditions.push('event_type = ?');
    params.push(condition.event_type);
  }
  
  if (condition.message_type !== undefined) {
    conditions.push('message_type = ?');
    params.push(condition.message_type);
  }
  
  // 构建完整 SQL 语句
  let sql = 'SELECT * FROM message';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC';
  
  return all<MessageModel>(sql, params);
}
