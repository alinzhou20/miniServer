/**
 * Fastify 应用构建器
 * 
 * 负责创建和配置 Fastify 应用实例，包括：
 * - 安全插件配置 (CORS, Helmet)
 * - JWT 认证配置
 * - 中间件装饰器
 * - 路由注册
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { ok } from './utils/response.js';
import { authRoutes } from './comm/http/auth.js';

/**
 * 构建 Fastify 应用实例
 * @returns {FastifyInstance} 配置完成的 Fastify 应用实例
 */
export function buildApp() {
  // 创建 Fastify 实例，启用日志记录
  const app = Fastify({ logger: true });

  // 注册安全和功能插件
  // CORS 插件：允许跨域请求，origin: true 表示允许所有来源
  app.register(cors, { origin: true });
  
  // Helmet 插件：设置各种 HTTP 头以提高安全性
  app.register(helmet);
  
  // JWT 插件：提供 JWT 令牌签名和验证功能
  app.register(jwt, {
    secret: process.env.JWT_SECRET || 'bgxx2025', // JWT 签名密钥，生产环境应使用环境变量
  });

  // 装饰器：为 Fastify 实例添加自定义方法
  // authRequired：JWT 认证中间件装饰器
  app.decorate('authRequired', async (request: any, reply: any) => {
    try {
      // 验证请求中的 JWT 令牌
      await request.jwtVerify();
    } catch (err) {
      // 验证失败，返回 401 未授权错误
      reply.code(401).send({ code: 401, message: 'unauthorized', at: Date.now() });
    }
  });

  // 路由注册：所有 API 路由都在 /api 前缀下
  app.register(async (instance) => {
    // 健康检查端点：GET /api/health
    instance.get('/health', async () => ok({ status: 'up' }));
    
    // 认证相关路由：/api/auth/*
    instance.register(authRoutes, { prefix: '/auth' });
  }, { prefix: '/api' });

  return app;
}

export type AppInstance = ReturnType<typeof buildApp>;
