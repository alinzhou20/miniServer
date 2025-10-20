/**
 * 实体事件类型
 */
export enum EventType {
  SUBMIT = 'submit',      // 提交(学生 -> 教师)
  DISPATCH = 'dispatch',  // 分发(教师 -> 学生)
  DISCUSS = 'discuss',    // 讨论(学生 <-> 学生)
  REQ = 'req',            // 请求(客户端 -> 服务端)
}

/**
 * 基础消息接口
 */
export interface BaseEvent {
  eventType: EventType;
  messageType: string;
  data: any;
}

/**
 * 提交消息载荷（学生 -> 教师）
 */
export interface SubmitEvent extends BaseEvent {
  from: {
    studentNo: string;
    groupNo?: string;
    studentRole?: string;
  };
}

/**
 * 分发消息载荷（教师 -> 学生）
 */
export interface DispatchEvent extends BaseEvent {
  to: {
    studentNo: string[];
    groupNo?: string[];
    studentRole?: string[];
  };
}

/**
 * 讨论消息载荷（学生 <-> 学生）
 */
export interface DiscussEvent extends BaseEvent {
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
export interface ReqEvent extends BaseEvent {
  from: {
    studentNo: string;
    groupNo?: string;
    studentRole?: string;
  };
}
