# API 设计（Fastify + Socket.IO，中文）

## 1. 约定

### 1.1 请求格式
- HTTP：
- 请求地址：`/api`
- 请求体：
  ```json
  {
    "token": "<jwt-token>",
    "data": { /* 任意业务数据 */ },
    "from": {
      "groupNo": "1",
      "studentNo": "1"
    }
  }
  ```

- Socket：
- 连接请求体：
  ```json
  {
    "auth": {
      "token": "<jwt>",
      "from": {
        "groupNo": "1",
        "studentNo": "1"
      }
    }
  }
  ```
- 消息请求体：
  ```json
  {
    "from": {
      "groupNo": "1",
      "studentNo": "1"
    },
    "to": {
      "groupNo": "0",
      "studentNo": "0"
    },
    "data": { /* 业务数据 */ }
  }
  ```

### 1.2 响应格式
- 响应格式：
  ```json
  {
    "code": "<status-code>",
    "message": "<message>",
    "form": { 
      "groupNo": "1",
      "studentNo": "1"
     },
    "to": { 
      "groupNo": "2",
      "studentNo": "2"
     },
    "data": { /* 业务数据 */ },
    "at": "<timestamp>"
  }
  ```

## 2. HTTP 接口

<details>
<summary><code>[POST] /api/auth/login/teacher</code> · 教师登录 </summary>

- 功能：教师通过环境变量配置的唯一账号登录
- 请求：
```json
{
  "username": "teacher",
  "password": "secret"
}
```
- 成功响应：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "<jwt-token>"
  }
}
```
</details>

<details>
<summary><code>[POST] /api/auth/login/student</code> · 学生登录</summary>

- 功能：学生使用学号 + 4 位密码登录
- 请求：
```json
{
  "studentNo": "1",
  "groupNo": "1",
  "pin4": "1234"
}
```
- 成功响应：
```json
{
  "code": 200,
  "data": {
    "token": "<jwt-token>"
  }
}
```
- 错误响应：
```json
{ "code": 401, "message": "学号不存在或密码错误" }
```

</details>

## 2. Socket.IO 通信

房间约定（命名空间 `/room` 内）：
- `teacher` — 教师域（教师广播给教师端）
- `group:<groupNo>` — 小组房间（小组动态变化，groupNo 可变）
- `student` — 学生域（教师广播给学生端）
- `student:<role>` — 学生角色房间
- `student:<studentNo>` — 点对点（针对单个学生的直发）

<details>
<summary><code>join</code> · 加入房间</summary>

- 客户端携带 `auth.token` 连接：`io('/room', { auth: { token } })`
- 服务端验证 Token，注入用户上下文（如 `socket.data = { userId, role, groupNo }`）

- 默认自动加入房间（无需手动 join）：
  - 教师：加入 `teacher`
  - 学生：加入 `student`、`student:<role>`、`student:<studentNo>`、`group:<groupNo>`

</details>

### 2.1 教师
<details>
<summary><code>message</code> · 发送消息</summary>

- 教师请求：
  ```json
  {
    "from": {
      "groupNo": "0",
      "studentNo": "0"
    },
    "to": {
      "groupNo": "1",
      "studentNo": "1"
    },
    "data": { /* 业务数据 */ }
  }
  ```

- 学生响应：
  ```json
  {
    "code": "<status-code>",
    "message": "<message>",
    "form": { 
      "groupNo": "0",
      "studentNo": "0"
     },
    "to": { 
      "groupNo": "1",
      "studentNo": "1"
     },
    "data": { /* 业务数据 */ },
    "at": "<timestamp>"
  }
  ```

### 2.2 学生
<details>
<summary><code>message</code> · 发送消息</summary>

- 学生请求：
  ```json
  {
    "from": {
      "groupNo": "1",
      "studentNo": "1"
    },
    "to": {
      "groupNo": "0",
      "studentNo": "0"
    },
    "data": { /* 业务数据 */ }
  }
  ```

- 教师响应：
  ```json
  {
    "code": "<status-code>",
    "message": "<message>",
    "form": { 
      "groupNo": "1",
      "studentNo": "1"
     },
    "to": { 
      "groupNo": "0",
      "studentNo": "0"
     },
    "data": { /* 业务数据 */ },
    "at": "<timestamp>"
  }
  ```