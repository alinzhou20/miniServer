/**
 * 消息恢复服务
 * 提供历史消息的查询和恢复功能
 */

import { getMessagesByCondition } from '../data/messageDao.js';
import { findUserByStudentNo } from '../data/userDao.js';
import type { MessageModel, UserModel } from '../type/index.js';
import { EventType } from '../type/index.js';

/**
 * 消息分组结果（按消息类型分组，每种类型保留最新的一条）
 */
export interface MessageGroup {
  [messageType: string]: {
    message: MessageModel;
    data: any;  // 解析后的消息数据
  };
}

/**
 * 讨论消息分组结果（按消息类型和对方学号分组）
 */
export interface DiscussMessageGroup {
  [messageType: string]: {
    [studentNo: number]: {
      info: UserModel;       // 对方用户信息
      message: MessageModel; // 消息内容
      data: any;             // 解析后的消息数据
    };
  };
}

/**
 * 用户恢复消息结构
 */
export interface UserRestoreMessages {
  submit?: MessageGroup;          // 已提交的消息（发送给教师）
  dispatch?: MessageGroup;         // 已接收的分发消息（来自教师）
  discussSent?: DiscussMessageGroup;   // 发送的讨论消息
  discussReceived?: DiscussMessageGroup;   // 接收的讨论消息
}

/**
 * 教师恢复消息结构（按消息类型和学生学号分组）
 */
export interface TeacherRestoreMessages {
  [messageType: string]: {
    [studentNo: number]: {
      info: UserModel;
      message: MessageModel;
      data: any;  // 解析后的消息数据
    };
  };
}

/**
 * 解析消息数据（从 Buffer 转换为对象）
 * @param data - 消息数据（Buffer 或其他格式）
 * @returns 解析后的数据对象
 */
function parseMessageData(data: any): any {
  if (!data) return null;
  
  try {
    if (Buffer.isBuffer(data)) {
      return JSON.parse(data.toString('utf-8'));
    }
    return data;
  } catch (error) {
    console.warn('[Restore] 解析消息数据失败:', error);
    return null;
  }
}

/**
 * 恢复用户发送的消息
 * 获取用户发送的所有 submit 和 discuss 消息，按类型取最新
 * @param studentNo - 学生学号
 * @returns 已发送的消息（按类型分组）
 */
export async function restoreUserSentMessages(studentNo: number): Promise<UserRestoreMessages> {
  // 查询该学生发送的所有消息
  const sentMessages = await getMessagesByCondition({ from_no: studentNo });

  const result: UserRestoreMessages = {
    submit: {},
    discussSent: {}
  };
  
  for (const message of sentMessages) {
    const { event_type, message_type, created_at, to_no } = message;
    if (!event_type || !message_type || !created_at) continue;
    
    // 处理 submit 消息（学生提交给教师）
    if (event_type === EventType.SUBMIT) {
      const current = result.submit![message_type];
      if (!current || created_at > (current.message.created_at || 0)) {
        result.submit![message_type] = {
          message: message,
          data: parseMessageData(message.data)
        };
      }
    }
    
    // 处理 discuss 消息（发送给其他学生）
    else if (event_type === EventType.DISCUSS) {
      if (to_no === null || to_no === undefined) continue;
      
      if (!result.discussSent![message_type]) {
        result.discussSent![message_type] = {};
      }
      
      const current = result.discussSent![message_type][to_no];
      if (!current || created_at > (current.message.created_at || 0)) {
        // 查询接收者信息
        const userInfo = await findUserByStudentNo(to_no);
        result.discussSent![message_type][to_no] = {
          info: userInfo || { student_no: to_no },
          message: message,
          data: parseMessageData(message.data)
        };
      }
    }
  }
  
  return result;
}

/**
 * 恢复用户接收的消息
 * 获取用户接收的所有 dispatch 和 discuss 消息，按类型取最新
 * @param studentNo - 学生学号
 * @returns 已接收的消息（按类型分组）
 */
export async function restoreUserReceivedMessages(studentNo: number): Promise<UserRestoreMessages> {
  // 查询该学生接收的所有消息
  const receivedMessages = await getMessagesByCondition({ to_no: studentNo });

  const result: UserRestoreMessages = {
    dispatch: {},
    discussReceived: {}
  };
  
  for (const message of receivedMessages) {
    const { event_type, message_type, created_at, from_no } = message;
    if (!event_type || !message_type || !created_at) continue;
    
    // 处理 dispatch 消息（教师分发给学生）
    if (event_type === EventType.DISPATCH) {
      const current = result.dispatch![message_type];
      if (!current || created_at > (current.message.created_at || 0)) {
        result.dispatch![message_type] = {
          message: message,
          data: parseMessageData(message.data)
        };
      }
    }
    
    // 处理 discuss 消息（其他学生发送的）
    else if (event_type === EventType.DISCUSS) {
      if (from_no === null || from_no === undefined) continue;
      
      if (!result.discussReceived![message_type]) {
        result.discussReceived![message_type] = {};
      }
      
      const current = result.discussReceived![message_type][from_no];
      if (!current || created_at > (current.message.created_at || 0)) {
        // 查询发送者信息
        const userInfo = await findUserByStudentNo(from_no);
        result.discussReceived![message_type][from_no] = {
          info: userInfo || { student_no: from_no },
          message: message,
          data: parseMessageData(message.data)
        };
      }
    }
  }
  
  return result;
}

/**
 * 恢复教师接收的所有学生提交消息
 * 获取所有学生的 submit 消息，按学生和消息类型分组
 * @returns 所有学生提交的消息
 */
export async function restoreTeacherMessages(): Promise<TeacherRestoreMessages> {
  // 查询所有提交给教师的消息（to_no 为 0，教师学号）
  const submitMessages = await getMessagesByCondition({
    to_no: 0,
    event_type: EventType.SUBMIT
  });
  
  const result: TeacherRestoreMessages = {};
  
  for (const message of submitMessages) {
    const { message_type, from_no, created_at } = message;
    if (!message_type || from_no === null || from_no === undefined || !created_at) continue;
    
    // 按消息类型分组
    if (!result[message_type]) {
      result[message_type] = {};
    }
    
    // 取每个学生的最新消息
    const current = result[message_type][from_no];
    if (!current || created_at > (current.message.created_at || 0)) {
      // 查询学生信息
      const userInfo = await findUserByStudentNo(from_no);
      result[message_type][from_no] = {
        info: userInfo || { student_no: from_no },
        message: message,
        data: parseMessageData(message.data)
      };
    }
  }
  
  return result;
}
