/**
 * 认证路由模块
 * 
 * 提供教师和学生的登录认证功能：
 * - 教师登录：用户名密码验证
 * - 学生登录：学号、小组号、PIN码验证
 * - JWT 令牌生成和返回
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok, fail } from '../../utils/response.js';
import { AuthService as StudentAuthService } from '../../service';

/**
 * 教师登录请求数据验证模式
 * 要求用户名和密码都不能为空
 */
const TeacherLoginSchema = z.object({
  username: z.string().min(1), // 用户名，至少1个字符
  password: z.string().min(1), // 密码，至少1个字符
});

/**
 * 学生登录请求数据验证模式
 * 支持班级编号、学号、小组号（可选）、PIN码验证
 */
const StudentLoginSchema = z.object({
  classNo: z.string().length(3), // 班级编号，3位数字字符串
  studentNo: z.coerce.number().int().nonnegative(),  // 学号，非负整数
  groupNo: z.union([z.coerce.number().int().nonnegative(), z.literal(''), z.null()]).transform((v) => (v === '' || v === null ? null : Number(v))).optional(), // 小组号，可为空
  pin4: z.string().length(4).optional(), // 4位PIN码，可选
});

/**
 * 注册认证相关路由
 * @param {FastifyInstance} app - Fastify 应用实例
 */
export async function authRoutes(app: FastifyInstance) {
  /**
   * 教师登录路由
   * POST /api/auth/login/teacher
   * 
   * 请求体：{ username: string, password: string }
   * 响应：成功返回 JWT 令牌，失败返回错误信息
   */
  app.post('/login/teacher', async (req, reply) => {
    // 验证请求数据格式
    const parsed = TeacherLoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail(400, 'invalid payload'));
    
    const { username, password } = parsed.data;
    
    // 使用环境变量验证教师身份
    const teacherUsername = process.env.TEACHER_USERNAME || 'admin';
    const teacherPassword = process.env.TEACHER_PASSWORD || 'bgxx123456';
    
    if (username === teacherUsername && password === teacherPassword) {
      // 生成 JWT 令牌，有效期8小时
      const token = app.jwt.sign({ role: 'teacher', username }, { expiresIn: '8h' });
      return reply.send(ok({ token }, '登录成功'));
    }
    
    // 验证失败，返回错误
    return reply.code(401).send(fail(401, '用户名或密码错误'));
  });

  /**
   * 学生登录路由
   * POST /api/auth/login/student
   * 
   * 请求体：{ studentNo: number, groupNo?: number, pin4: string }
   * 响应：成功返回 JWT 令牌，失败返回错误信息
   */
  app.post('/login/student', async (req, reply) => {
    // 验证请求数据格式
    const parsed = StudentLoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail(400, 'invalid payload'));
    
    const { classNo, studentNo, groupNo, pin4 } = parsed.data;

    // 调用学生认证服务进行登录
    const result = StudentAuthService.login(
      { classNo, studentNo, groupNo: groupNo ?? undefined, pin4 },
      app.jwt.sign.bind(app.jwt) // 传递JWT签名函数
    );

    if (!result.success) {
      return reply.code(401).send(fail(401, result.message || '登录失败'));
    }

    return reply.send(ok({ token: result.token, student: result.student }, result.message));
  });
}
