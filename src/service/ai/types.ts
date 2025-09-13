/**
 * AI服务模块类型定义
 */

/**
 * 对话请求参数
 */
export interface ChatRequest {
  message: string;
  context?: {
    studentId?: number;
    courseId?: number;
    activityId?: number;
  };
}

/**
 * 对话响应结果
 */
export interface ChatResponse {
  success: boolean;
  reply?: string;
  error?: string;
  timestamp: number;
}
