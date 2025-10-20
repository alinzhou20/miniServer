/**
 * 确认消息（服务端 -> 客户端）
 */
export interface AckMessage {
  success: boolean;      // 是否成功
  message?: string;      // 可选的消息说明
  data?: any;           // 可选的响应数据
  timestamp: number;     // 时间戳
}

export interface StatusMessage {
  isOnline: boolean;        // 是否在线
  activeIndex: number;      // 所在索引
  detail: any;              // 详细信息
}