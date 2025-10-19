/**
 * 实体事件类型
 */
export enum EventType {
  SUBMIT = 'submit',      // 提交(学生 -> 教师)
  DISPATCH = 'dispatch',  // 分发(教师 -> 学生)
  DISCUSS = 'discuss',    // 讨论(学生 <-> 学生)
  REQ = 'req',    // 请求(客户端 -> 服务端)
  ACK = 'ack',           // 确认(服务端 -> 客户端)
}

/**
 * 基础消息接口
 */
export interface BaseMessage {
  eventType: EventType;
  messageType: string;
  data: any;
}

/**
 * 提交消息载荷（学生 -> 教师）
 */
export interface SubmitMessage extends BaseMessage {
  from: {
    studentNo: string;
    groupNo?: string;
    studentRole?: string;
  };
}

/**
 * 分发消息载荷（教师 -> 学生）
 */
export interface DispatchMessage extends BaseMessage {
  to: {
    studentNo: string[];
    groupNo?: string[];
    studentRole?: string[];
  };
}

/**
 * 讨论消息载荷（学生 <-> 学生）
 */
export interface DiscussMessage extends BaseMessage {
  from: {
    studentNo: string;
    groupNo?: string;
    studentRole?: string;
  };
  to: {
    studentNo: string[];
    groupNo?: string[];
    studentRole?: string[];
  };
}

/**
 * 请求消息载荷（客户端 -> 服务端）
 */
export interface ReqMessage extends BaseMessage {
  from: {
    studentNo: string;
    groupNo?: string;
    studentRole?: string;
  };
}

/**
 * 确认消息（服务端 -> 客户端）
 */
export interface AckMessage {
  success: boolean;      // 是否成功
  message?: string;      // 可选的消息说明
  data?: any;           // 可选的响应数据
  timestamp: number;     // 时间戳
}