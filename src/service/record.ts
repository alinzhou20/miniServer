/**
 * 消息记录服务
 * 负责将 Socket 消息持久化到数据库
 */

import { createMessage } from '../data/messageDao.js';
import { findUserByStudentNo, findUsersByGroupNo } from '../data/userDao.js';
import { EventType } from '../type/index.js';
import type { BaseMessage, SubmitMessage, DispatchMessage, DiscussMessage, MessageModel } from '../type/index.js';

/**
 * 从 studentNo 解析为学号
 * @param studentNo - 学号（字符串）
 * @returns 学号（数字）或 undefined
 */
async function resolveStudentNo(studentNo: string): Promise<number | undefined> {
  const user = await findUserByStudentNo(Number(studentNo));
  return user?.student_no;
}

/**
 * 从 groupNo 解析为该组所有学生的学号
 * @param groupNo - 组号（字符串）
 * @returns 学号数组
 */
async function resolveGroupStudentNos(groupNo: string): Promise<number[]> {
  const users = await findUsersByGroupNo(Number(groupNo));
  return users.map(u => u.student_no!).filter(no => no !== undefined);
}

/**
 * 解析目标学号列表
 * @param to - 目标信息（可能包含 studentNo 数组或 groupNo 数组）
 * @returns 目标学号数组
 */
async function resolveToStudentNos(to: any): Promise<number[]> {
  const studentNos: number[] = [];
  
  // 解析学号列表
  if (to.studentNo?.length) {
    for (const no of to.studentNo) {
      const studentNo = await resolveStudentNo(no);
      if (studentNo !== undefined) studentNos.push(studentNo);
    }
  }
  
  // 解析组号列表
  if (to.groupNo?.length) {
    for (const no of to.groupNo) {
      const groupStudentNos = await resolveGroupStudentNos(no);
      studentNos.push(...groupStudentNos);
    }
  }
  
  // 去重
  return [...new Set(studentNos)];
}

/**
 * 记录消息到数据库
 * 解析消息载荷，提取发送者、接收者等信息并存储
 * @param payload - 消息载荷（支持 submit/dispatch/discuss 类型）
 * @returns 是否记录成功
 */
export async function recordMessage(payload: BaseMessage): Promise<boolean> {
  try {
    const { eventType, messageType, data } = payload;
    
    let fromNo: number | undefined = undefined;
    let toNos: number[] = [];
    
    // 根据事件类型解析消息
    switch (eventType) {
      case EventType.SUBMIT: {
        // 学生提交：from 是学号，to 是教师（0）
        const submitMsg = payload as SubmitMessage;
        if (submitMsg.from?.studentNo) {
          fromNo = await resolveStudentNo(submitMsg.from.studentNo);
        }
        toNos = [0];  // 教师学号为 0
        break;
      }
      
      case EventType.DISPATCH: {
        // 教师分发：from 是教师（0），to 是学生/组
        const dispatchMsg = payload as DispatchMessage;
        fromNo = 0;  // 教师学号为 0
        toNos = await resolveToStudentNos(dispatchMsg.to);
        if (toNos.length === 0) {
          // 如果没有指定目标，记录为广播（to_no 为 null）
          toNos = [null as any];
        }
        break;
      }
      
      case EventType.DISCUSS: {
        // 学生讨论：from 和 to 都是学生/组
        const discussMsg = payload as DiscussMessage;
        if (discussMsg.from?.studentNo) {
          fromNo = await resolveStudentNo(discussMsg.from.studentNo);
        }
        toNos = await resolveToStudentNos(discussMsg.to);
        if (toNos.length === 0) {
          // 如果没有指定目标，记录为小组广播
          toNos = [null as any];
        }
        break;
      }
      
      default:
        // 其他事件类型不记录
        console.warn(`[Record] 未知事件类型: ${eventType}`);
        return false;
    }

    // 将数据序列化为 Buffer（如果不是）
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
    
    // 为每个接收者创建消息记录
    for (const toNo of toNos) {
      const record: MessageModel = {
        from_no: fromNo,
        to_no: toNo,
        event_type: eventType,
        message_type: messageType,
        data: dataBuffer,
        created_at: Date.now()
      };
      await createMessage(record);
    }
    
    console.log(`[Record] 记录消息成功 - 类型: ${eventType}/${messageType}, 发送者: ${fromNo || 'unknown'}, 接收者数: ${toNos.length}`);
    return true;
  } catch (error: any) {
    console.error('[Record] 记录消息失败:', error.message);
    return false;
  }
}
