/**
 * API 响应工具函数
 * 
 * 提供统一的 API 响应格式：
 * - 标准化响应结构
 * - 成功和失败响应的便捷构造函数
 * - 支持泛型数据类型
 */

/**
 * API 响应接口定义
 * @template T 响应数据的类型
 */
export interface ApiResponse<T = unknown> {
  code: number;                                                    // HTTP 状态码
  message: string;                                                 // 响应消息
  from?: { groupNo: number | string; studentNo: number | string }; // 发送者信息（WebSocket 使用）
  to?: { groupNo: number | string; studentNo: number | string };   // 接收者信息（WebSocket 使用）
  data?: T;                                                        // 响应数据
  at: number;                                                      // 响应时间戳
}

/**
 * 构造成功响应
 * @template T 数据类型
 * @param {T} data - 响应数据
 * @param {string} message - 成功消息，默认为 'success'
 * @returns {ApiResponse<T>} 成功响应对象
 */
export function success<T>(data?: T, message = 'success'): ApiResponse<T> {
  return { code: 200, message, data, at: Date.now() };
}

/**
 * 构造失败响应
 * @param {number} code - 错误状态码，默认为 400
 * @param {string} message - 错误消息，默认为 'failure'
 * @returns {ApiResponse<never>} 失败响应对象
 */
export function failure(code = 400, message = 'failure'): ApiResponse<never> {
  return { code, message, at: Date.now() };
}
