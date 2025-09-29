/**
 * 消息（message）数据访问
 */

import { all, get, run } from './connect.js';
import type { MessageModel } from '../type/index.js';

/**
 * 创建消息
 */
export async function createMessage(input: MessageModel): Promise<MessageModel> {
  const result = await run(
    `INSERT INTO message (from_id, to_id, event_type, message_type, activity_index, data, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
     [
       input.from_id ?? null,
       input.to_id ?? null,
       input.event_type,
       input.message_type,
       input.activity_index,
       input.data,
       input.created_at ?? Date.now()
     ]
  );
  const row = await get<MessageModel>(`SELECT * FROM message WHERE id = ?;`, [result.lastID]);
  if (!row) throw new Error('Failed to create message');
  return row;
}

/**
 * 按来源ID查询消息
 */
export async function getMessagesByFrom(fromId: number | null): Promise<MessageModel[]> {
  if (fromId === null) {
    return all<MessageModel>(
      `SELECT * FROM message WHERE from_id IS NULL ORDER BY created_at DESC;`,
    );
  }
  return all<MessageModel>(
    `SELECT * FROM message WHERE from_id = ? ORDER BY created_at DESC;`,
    [fromId]
  );
}

/**
 * 按目标ID查询消息
 */
export async function getMessagesByTo(toId: number | null): Promise<MessageModel[]> {
  if (toId === null) {
    return all<MessageModel>(
      `SELECT * FROM message WHERE to_id IS NULL ORDER BY created_at DESC;`,
    );
  }
  return all<MessageModel>(
    `SELECT * FROM message WHERE to_id = ? ORDER BY created_at DESC;`,
    [toId]
  );
}

/**
 * 按活动序号查询消息
 */
export async function getMessagesByActivity(activityIndex: number): Promise<MessageModel[]> {
  return all<MessageModel>(
    `SELECT * FROM message WHERE activity_index = ? ORDER BY created_at DESC;`,
    [activityIndex]
  );
}

/**
 * 按事件类型查询消息
 */
export async function getMessagesByEventType(eventType: string): Promise<MessageModel[]> {
  return all<MessageModel>(
    `SELECT * FROM message WHERE event_type = ? ORDER BY created_at DESC;`,
    [eventType]
  );
}

/**
 * 按消息类型查询消息
 */
export async function getMessagesByMessageType(messageType: string): Promise<MessageModel[]> {
  return all<MessageModel>(
    `SELECT * FROM message WHERE message_type = ? ORDER BY created_at DESC;`,
    [messageType]
  );
}

/**
 * 按活动序号和来源ID查询消息
 */
export async function getMessagesByActivityAndFrom(activityIndex: number, fromId: number): Promise<MessageModel[]> {
  return all<MessageModel>(
    `SELECT * FROM message WHERE activity_index = ? AND from_id = ? ORDER BY created_at DESC;`,
    [activityIndex, fromId]
  );
}

/**
 * 按活动序号和目标ID查询消息
 */
export async function getMessagesByActivityAndTo(activityIndex: number, toId: number): Promise<MessageModel[]> {
  return all<MessageModel>(
    `SELECT * FROM message WHERE activity_index = ? AND to_id = ? ORDER BY created_at DESC;`,
    [activityIndex, toId]
  );
}

/**
 * 灵活的组合查询消息
 */
export async function getMessagesByCondition(condition: MessageModel): Promise<MessageModel[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  
  // 动态构建WHERE条件
  if (condition.id !== undefined) {
    conditions.push('id = ?');
    params.push(condition.id);
  }
  
  if (condition.from_id !== undefined) {
    if (condition.from_id === null) {
      conditions.push('from_id IS NULL');
    } else {
      conditions.push('from_id = ?');
      params.push(condition.from_id);
    }
  }
  
  if (condition.to_id !== undefined) {
    if (condition.to_id === null) {
      conditions.push('to_id IS NULL');
    } else {
      conditions.push('to_id = ?');
      params.push(condition.to_id);
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
  
  if (condition.activity_index !== undefined) {
    conditions.push('activity_index = ?');
    params.push(condition.activity_index);
  }
  
  // 构建SQL语句
  let sql = 'SELECT * FROM message';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC';
  
  return all<MessageModel>(sql, params);
}
