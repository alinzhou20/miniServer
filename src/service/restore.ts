/**
 * 恢复服务 - 消息恢复功能（精简版）
 */

import { 
  getMessagesByCondition,
  findEntityById,
} from '../data/index.js';
import type { MessageModel, EntityRestoreMessages, TeacherRestoreMessages } from '../type/index.js';
import { EventType } from '../type/index.js';


/**
 * 主体按活动恢复已发的所有类型的最新消息
 */
export async function entitySendActivitySend(entityId: number, activityIndex: number): Promise<EntityRestoreMessages> {
  // 获取该主体发送的所有消息
  const sendMessages = await getMessagesByCondition({
    from_id: entityId,
    activity_index: activityIndex
  } as MessageModel);

  // 解析 submit 和 discuss 消息
  const result: EntityRestoreMessages = { submit: {}, discuss: {} };
  
  for (const message of sendMessages) {
    const eventType = message.event_type;
    const messageType = message.message_type;
    const createdAt = message.created_at;
    
    // 跳过无效消息
    if (!eventType || !messageType || !createdAt) continue;
    
    if (eventType === EventType.SUBMIT) {
      // 处理 submit 消息
      if (!result.submit) result.submit = {};
      
      if (!result.submit[messageType] || 
          createdAt > (result.submit[messageType].created_at || 0)) {
        result.submit[messageType] = message;
      }
      
    } else if (eventType === EventType.DISCUSS) {
      // 处理 discuss 消息，按 to_id 分类
      if (!result.discuss[messageType]) result.discuss[messageType] = {};
      
      const toId = message.to_id;
      if (toId !== null && toId !== undefined) {
        if (!result.discuss[messageType][toId] || 
            createdAt > (result.discuss[messageType][toId].message.created_at || 0)) {
          
          // 查询对应 id 的主体信息
          const entityInfo = await findEntityById(toId);
          
          result.discuss[messageType][toId] = {
            info: entityInfo || { id: toId },
            message: message
          };
        }
      }
    }
  }
  
  return result;
}

/**
 * 主体按活动恢复已收的所有类型所有小组的最新消息 - 按来源ID分类
 */
export async function entityActivityReceive(entityId: number, activityIndex: number): Promise<EntityRestoreMessages> {
  // 获取该主体接收的所有消息
  const receiveMessages = await getMessagesByCondition({
    to_id: entityId,
    activity_index: activityIndex
  } as MessageModel);

  // 解析接收的消息，支持 dispatch 和 discuss
  const result: EntityRestoreMessages = { dispatch: {}, discuss: {} };
  
  for (const message of receiveMessages) {
    const eventType = message.event_type;
    const messageType = message.message_type;
    const createdAt = message.created_at;
    
    // 跳过无效消息
    if (!eventType || !messageType || !createdAt) continue;
    
    if (eventType === EventType.DISPATCH) {
      // 处理 dispatch 消息（教师分发的消息）
      if (!result.dispatch) result.dispatch = {};
      
      if (!result.dispatch[messageType] || 
          createdAt > (result.dispatch[messageType].created_at || 0)) {
        result.dispatch[messageType] = message;
      }
      
    } else if (eventType === EventType.DISCUSS) {
      // 处理 discuss 消息，按 from_id 分类
      if (!result.discuss[messageType]) result.discuss[messageType] = {};
      
      const fromId = message.from_id || 0;
      if (!result.discuss[messageType][fromId] || 
          createdAt > (result.discuss[messageType][fromId].message.created_at || 0)) {
        
        // 查询发送者的主体信息
        const entityInfo = await findEntityById(fromId);
        result.discuss[messageType][fromId] = {
          info: entityInfo || { id: fromId },
          message: message
        };
      }
    }
  }
  return result;
}

/**
 * 教师按活动恢复所有最新消息
 */
export async function teacherActivityRestore(activityIndex: number): Promise<TeacherRestoreMessages> {
  const receiveMessages = await getMessagesByCondition({
    to_id: null,
    event_type: EventType.SUBMIT,
    activity_index: activityIndex
  });
  // 解析接收的消息，支持 submit 中的 status 消息
  const result: TeacherRestoreMessages = {};
  
  for (const message of receiveMessages) {
    const messageType = message.message_type;
    const createdAt = message.created_at;
    const fromId = message.from_id;
    
    // 跳过无效消息
    if (!messageType || !createdAt || !fromId) continue;

     if (!result[messageType]) result[messageType] = {};
     
     if (!result[messageType][fromId] || 
         createdAt > (result[messageType][fromId].message.created_at || 0)) {
       const entityInfo = await findEntityById(fromId);
       result[messageType][fromId] = {
         info: entityInfo || { id: fromId },
         message: message
       };
     }
  }
  return result;
}