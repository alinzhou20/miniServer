/**
 * 基础事件类型
 */

import type { EntityModel, MessageModel } from './model.js';

/**
 * 实体事件类型
 */
export enum EventType {
  SUBMIT = 'submit',      // 提交(学生/小组 -> 教师)
  DISPATCH = 'dispatch',  // 分发(教师 -> 学生/小组)
  DISCUSS = 'discuss',    // 讨论(学生/小组 <-> 学生/小组)
  REQUEST = 'request',    // 请求(客户端 -> 服务端)
  ERROR = 'error',        // 错误
  OFF_LINE = 'off_line',  // 离线
}

/**
 * 实体模式
 */
export enum EntityMode {
  STUDENT = 'student_only',                        // 实体仅为学生
  GROUP = 'group_only',                            // 实体仅为小组
  STUDENT_GROUP = 'student_group',                 // 实体包含学生和小组
  STUDENT_GROUP_ROLE = 'student_group_role',       // 实体包含学生和小组，且有角色
}

/**
 * 基础消息接口
 */
export interface BaseMessage {
  mode: EntityMode;
  eventType: EventType;
  messageType: string;
  activityIndex: string;
  data: Buffer;
}

/**
 * 提交消息载荷（学生 -> 教师）
 */
export interface SubmitMessage extends BaseMessage {
  from: {
    id: string;
    groupNo?: string;
    studentNo?: string;
    studentRole?: string;
  };
  to: null;
}

/**
 * 分发消息载荷（教师 -> 学生/小组）
 */
export interface DispatchMessage extends BaseMessage {
  from: null;
  to: {
    groupNo?: string[];
    studentNo?: string[];
    studentRole?: string[];
  };
}

/**
 * 讨论消息载荷（学生 <-> 学生）
 */
export interface DiscussMessage extends BaseMessage {
  from: {
    id: string;
    groupNo?: string;
    studentNo?: string;
    studentRole?: string;
  };
  to: {
    groupNo?: string[];
    studentNo?: string[];
    studentRole?: string[];
  };
}

/**
 * 请求消息载荷（客户端 -> 服务端）
 */
export interface RequestMessage extends BaseMessage {
  from?: {
    id: string;
    groupNo?: string;
    studentNo?: string;
    studentRole?: string;
  };
}

/**
 * 实体消息恢复 - 按事件类型和消息类型分类的消息
 */
export interface EntityRestoreMessages {
  // 提交
  submit?: {
    [messageType: string]: MessageModel;
  };
  dispatch?: {
    [messageType: string]: MessageModel;
  };
  // 讨论
  discuss: {
    // 消息类型
    [messageType: string]: {
      // 接收者或发送者id
      [id: number]: {
        // 接收者信息
        info: EntityModel;
        // 消息
        message: MessageModel;
      };
    };
  };
}

/**
 * 教师消息恢复 - 按事件类型和消息类型分类的消息
 */
export interface TeacherRestoreMessages {
  [messageType: string]: {
    // 实体id
    [id: number]: {
      // 实体信息
      info: EntityModel;
      // 消息
      message: MessageModel;
    };
  };
}