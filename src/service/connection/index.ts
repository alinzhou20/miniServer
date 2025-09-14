/**
 * 连接服务统一导出
 * 
 * 职责：
 * 1. 统一导出连接相关的所有服务和类型
 * 2. 提供模块的统一入口
 */

// 连接管理服务
export { Connect, type ConnectionInfo } from './connect';

// 认证服务
export { Auth, type AuthRequest, type AuthResult } from './auth';
