/**
 * 记录服务 - 消息记录功能
 */

import { createMessage, findEntityByStudentNo, findEntitiesByGroupId } from '../data/index.js';
import { EntityMode, EventType } from '../type/index.js';
import type { BaseMessage, SubmitMessage, DispatchMessage, DiscussMessage, MessageModel } from '../type/index.js';

/**
 * 解析目标主体ID列表
 */
async function resolveToId(payload: DispatchMessage | DiscussMessage): Promise<number[]> {
  const { mode, to } = payload;
  if (!to) return [];
  
  const ids: number[] = [];
  const studentNos = to.studentNo?.map(no => Number(no)) ?? [];
  const groupNos = to.groupNo?.map(no => Number(no)) ?? [];
  
  // 根据学号和组号获取主体ID
  if (mode != EntityMode.GROUP) {
    for (const studentNo of studentNos) {
      const entity = await findEntityByStudentNo(studentNo);
      if (entity) ids.push(entity.id!);
    }
  }
  if (mode != EntityMode.STUDENT) {
    for (const groupNo of groupNos) {
      const entities = await findEntitiesByGroupId(groupNo);
      entities.forEach(entity => ids.push(entity.id!));
    }
  }
  return [...new Set(ids)] ; // 去重
}

/**
 * 记录消息
 */
export async function recordMessage(payload: DispatchMessage | DiscussMessage | SubmitMessage): Promise<boolean> {
  let fromId: number | null = null;
  let toIds: number[] | null = null;
  if (payload.eventType == EventType.SUBMIT) {
    fromId = Number(payload.from?.id);
  }
  if (payload.eventType == EventType.DISPATCH) {
    toIds = await resolveToId(payload as DispatchMessage | DiscussMessage);
  }
  if (payload.eventType == EventType.DISCUSS) {
    fromId = Number(payload.from?.id);
    toIds = await resolveToId(payload as DispatchMessage | DiscussMessage);
  }

  if (fromId && toIds) {
    for (const toId of toIds) {
      const record: MessageModel = {
        from_id: fromId,
        to_id: toId,
        event_type: payload.eventType,
        message_type: payload.messageType,
        activity_index: Number(payload.activityIndex),
        data: payload.data,
        created_at: Date.now()
      };
      await createMessage(record);
    }
  }
  return true;
}