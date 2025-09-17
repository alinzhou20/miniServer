# Socket.IO 接口文档（Classroom Namespace）

面向前端/客户端快速接入的 Socket.IO 接口说明。本文档基于当前实现（源码：`src/socket/handler.ts`, `src/socket/message.ts`），可直接用于在局域网中开发教师端与学生端客户端。

- 命名空间：`/classroom`
- 统一 ACK 返回结构：`{ code: number, message: string, data?: any, at?: number }`
- 统一消息载荷（大多数事件）：
  ```ts
  interface MessagePayload {
    type: string;              // 事件内部类型或服务标识（见各小节）
    from?: {                   // 可选：来源信息
      groupNo?: string;
      studentNo?: string;
    };
    to?: {                     // 可选：目标（仅 distribute/discuss 有意义）
      groupNo?: string[];
      studentNo?: string[];
    };
    data: any;                 // 业务数据
    at: number;                // 服务器写入的时间戳（ms）
  }
  ```

> 注意：在 `request` 事件中，`payload.type` 被用作“服务标识”（如 `get_stu_status`），而不是固定写 `request`。

---

## 1. 连接与握手

<details>
<summary>握手认证（教师 / 学生）</summary>

命名空间：`/classroom`

握手通过 HTTP 头传递认证信息，服务端在中间件中校验（参考 `src/socket/handler.ts`）。

- 教师端需要：
  - `role: teacher`
  - `username: string`
  - `password: string`
  - 服务端对比环境变量 `TEACHER_USERNAME` 与 `TEACHER_PASSWORD`（默认 `admin` / `bgxx2025`）。

- 学生端需要：
  - `role: student`
  - `class_no: string`       班级号（如 `601`）
  - `student_no: number`     学号（数值）
  - `group_no: number`       小组号（数值）
  - `pin4?: string`          4 位 PIN（若数据库中该学生设置了 PIN，则必填且需匹配）

校验失败将拒绝连接（抛错并断开），成功后会在 `socket` 上写入：
- `socket.role`: `teacher | student`
- 学生连接还会写入：`socket.studentId`, `socket.studentNo`, `socket.groupNo`

前端示例（JS/TS）：
```ts
import { io } from 'socket.io-client';

// 教师端
const teacher = io(`${baseURL}/classroom`, {
  extraHeaders: {
    role: 'teacher',
    username: 'admin',
    password: 'bgxx2025',
  },
});

// 学生端
const student = io(`${baseURL}/classroom`, {
  extraHeaders: {
    role: 'student',
    class_no: '601',
    student_no: '1001',
    group_no: '3',
    pin4: '1234', // 如数据库该生设有 PIN，则必填
  },
});
```
</details>

<details>
<summary>房间约定</summary>

服务端会将连接加入以下房间（参考 `src/socket/handler.ts`）：
- 教师：`teacher`
- 学生通用：`student`
- 单个学生：`student:{studentNo}`（如 `student:1001`）
- 小组：`group:{groupNo}`（如 `group:3`）

建议客户端按需监听相应事件即可，无需主动加入房间。
</details>

---

## 2. 在线与离线通知（面向教师）

本节描述服务端在学生连接/断开时向教师端推送的事件。

<details>
<summary>online（学生上线）</summary>

- 方向：服务端 -> 教师端（若教师在线）
- 触发：学生连接建立成功（参考 `handler.ts:206-212`）
- 载荷：
  ```ts
  {
    studentNo: number,
    groupNo: number,
    at: number // ms 时间戳
  }
  ```

- 教师端示例：
  ```ts
  teacher.on('online', (payload) => {
    console.log('学生上线:', payload);
  });
  ```

- 备注：`request/get_stu_status` 服务也会向当前调用者 `socket.emit('online', students)` 推送一个学生列表对象（形状依赖 `Connect.findAll()` 返回值）。该用法属于服务回推，非全局广播。
</details>

<details>
<summary>offline（学生下线）</summary>

- 方向：服务端 -> 教师端（若教师在线）
- 触发：学生断开连接（参考 `handler.ts:218-224`）
- 载荷：
  ```ts
  {
    studentNo: number,
    groupNo: number,
    at: number // ms 时间戳
  }
  ```

- 教师端示例：
  ```ts
  teacher.on('offline', (payload) => {
    console.log('学生下线:', payload);
  });
  ```
</details>

---

## 3. 业务消息事件（带 ACK）

以下消息均通过 `socket.emit(event, payload, ack)` 发送，服务端会以 ACK 形式返回 `{ code, message, data?, at }`。

### 3.1 submit（学生 -> 教师）

<details>
<summary>submit</summary>

- 权限：仅学生端可发
- 服务端处理：转发到房间 `teacher`（参考 `message.ts:101-115`）
- 请求载荷：
  ```ts
  // 学生端 -> 服务端
  const payload: MessagePayload = {
    type: 'any-business-type', // 自定义业务子类型
    from: { studentNo: '1001', groupNo: '3' },
    data: { /* 任意业务数据 */ },
    at: Date.now(), // 客户端可先填，服务端会覆盖
  };

  student.emit('submit', payload, (ack) => {
    // ack: { code, message, at }
  });
  ```

- 教师端接收：
  ```ts
  teacher.on('submit', (payload: MessagePayload) => {
    // payload.at 为服务端时间
    console.log('来自学生的提交:', payload);
  });
  ```

- 可能的 ACK：
  - 成功：`{ code: 200, message: '提交成功', at }`
  - 失败（示例）：`{ code: 400, message: '无权限：仅学生可提交', at }`
</details>

### 3.2 distribute（教师 -> 学生/小组/全体）

<details>
<summary>distribute</summary>

- 权限：仅教师端可发
- 服务端处理：广播到房间 `student`（参考 `message.ts:120-135`）
- 请求载荷：
  ```ts
  // 教师端 -> 服务端
  const payload: MessagePayload = {
    type: 'announce' /* 或其他业务子类型 */,
    to: {
      // 当前实现服务端直接广播到 `student` 房间，
      // 前端可用 `to` 作为业务过滤依据（客户端自行判断是否处理）。
      groupNo: ['1', '3'],
      studentNo: ['1001', '1008'],
    },
    data: { title: '测验', content: '请在 10 分钟内完成' },
    at: Date.now(),
  };

  teacher.emit('distribute', payload, (ack) => {
    // ack: { code, message, at }
  });
  ```

- 学生端接收：
  ```ts
  student.on('distribute', (payload: MessagePayload) => {
    // 客户端可依据 payload.to 自行过滤是否处理
    console.log('来自教师的分发:', payload);
  });
  ```

- 可能的 ACK：
  - 成功：`{ code: 200, message: '广播成功', at }`
  - 失败（示例）：`{ code: 400, message: '无权限：仅教师可分发', at }`
</details>

### 3.3 discuss（学生 -> 学生/小组）

<details>
<summary>discuss</summary>

- 权限：仅学生端可发
- 服务端处理：广播到房间 `student`（参考 `message.ts:140-156`）
- 请求载荷：
  ```ts
  // 学生端 -> 服务端
  const payload: MessagePayload = {
    type: 'qa' /* 讨论子类型 */,
    to: { groupNo: ['3'] },
    from: { studentNo: '1001', groupNo: '3' },
    data: { text: '第2题怎么做？' },
    at: Date.now(),
  };

  student.emit('discuss', payload, (ack) => {
    // ack: { code, message, at }
  });
  ```

- 学生端接收：
  ```ts
  student.on('discuss', (payload: MessagePayload) => {
    // 客户端可依据 payload.to 自行过滤是否处理
    console.log('讨论消息:', payload);
  });
  ```

- 可能的 ACK：
  - 成功：`{ code: 200, message: '讨论成功', at }`
  - 失败（示例）：`{ code: 400, message: '无权限：仅学生可讨论', at }`
</details>

### 3.4 request（客户端 -> 服务）

<details>
<summary>request（使用 ACK 返回数据）</summary>

- 权限：教师/学生均可发
- 服务标识：使用 `payload.type` 选择服务处理器（参考 `message.ts:162-186, 188-197`）
- 目前内置服务：
  - `get_stu_status`：服务端会查询 `Connect.findAll()` 并通过 `socket.emit('online', students)` 回推当前调用者一个 `online` 事件（注意：这是“点对点回推”，不是广播）。同时 ACK 返回空对象。

- 请求载荷（示例）：
  ```ts
  // 任意客户端 -> 服务端
  const payload: MessagePayload = {
    type: 'get_stu_status', // 服务标识（关键）
    data: {},
    at: Date.now(),
  };

  socket.emit('request', payload, (ack) => {
    // 成功：{ code: 200, message: '请求成功', data: {}, at }
    // 失败：{ code: 404, message: '未提供 get_stu_status 服务', at }
  });

  // 点对点回推：
  socket.on('online', (students) => {
    console.log('当前学生连接列表:', students);
  });
  ```

- 可能的 ACK：
  - 成功：`{ code: 200, message: '请求成功', data: any, at }`
  - 未实现：`{ code: 404, message: '未提供 <type> 服务', at }`
  - 服务异常：`{ code: 500, message: '服务错误', at }`
</details>

---

## 4. 事件与房间路由行为说明

- `submit`：学生发出，服务端转发到 `teacher` 房间。教师端统一接收并根据 `payload.type` 自行分派。
- `distribute`：教师发出，服务端广播到 `student` 房间。客户端可基于 `payload.to` 决定是否处理。
- `discuss`：学生发出，服务端广播到 `student` 房间。客户端可基于 `payload.to` 决定是否处理。
- `request`：任何角色发出，依据 `payload.type` 匹配服务处理器执行逻辑，通过 ACK 返回结果；处理器内部可回推额外事件（如 `online`）。
- `online/offline`：仅在学生连接/断开时向当前在线教师推送（如有教师连接）。

---

## 5. 最佳实践与建议

- 统一封装 ACK 处理：为每次 `emit` 封装一个返回 Promise 的方法，便于错误统一处理与超时管理。
- `payload.at` 由服务端最终覆盖，无需强依赖客户端时间。
- `distribute/discuss` 场景建议客户端根据 `payload.to` 自行筛选，以避免 UI 干扰（当前实现是广播到所有学生连接）。
- `request` 的 `payload.type` 语义与其他事件不同（表示服务名），前端应特别注意避免与自定义 `type` 混淆。
- 教师端掉线重连后可调用 `request/get_stu_status` 获取当前在线学生列表快照。

---

## 6. 快速接入示例（汇总）

```ts
import { io, Socket } from 'socket.io-client';

const teacher = io(`${baseURL}/classroom`, { extraHeaders: { role: 'teacher', username: 'admin', password: 'bgxx2025' } });
const student = io(`${baseURL}/classroom`, { extraHeaders: { role: 'student', class_no: '601', student_no: '1001', group_no: '3', pin4: '1234' } });

// 教师监听学生上下线
teacher.on('online',  (p) => console.log('上线:', p));
teacher.on('offline', (p) => console.log('下线:', p));

// 学生提交->教师接收
student.emit('submit', { type: 'answer', from: { studentNo: '1001', groupNo: '3' }, data: { qid: 2, ans: 'B' }, at: Date.now() }, (ack) => console.log('submit ack', ack));
teacher.on('submit', (p) => console.log('收到提交', p));

// 教师分发->学生接收
teacher.emit('distribute', { type: 'task', to: { groupNo: ['1','3'] }, data: { id: 9, ttl: 600 }, at: Date.now() }, (ack) => console.log('distribute ack', ack));
student.on('distribute', (p) => console.log('分发', p));

// 学生讨论->学生接收
student.emit('discuss', { type: 'qa', to: { groupNo: ['3'] }, from: { studentNo: '1001', groupNo: '3' }, data: { text: '第2题讨论' }, at: Date.now() }, (ack) => console.log('discuss ack', ack));
student.on('discuss', (p) => console.log('讨论', p));

// 通用服务请求
teacher.emit('request', { type: 'get_stu_status', data: {}, at: Date.now() }, (ack) => console.log('request ack', ack));
teacher.on('online', (students) => console.log('学生列表快照', students));
```

---

## 7. 版本与源码引用

- 文档基于源码：
  - `src/socket/handler.ts`
  - `src/socket/message.ts`
- 命名空间：`/classroom`
- 返回结构：`{ code, message, data?, at }`

如需扩展更多 `request` 服务，请在 `src/socket/message.ts` 的 `serviceHandlers` 中新增键值处理器，并在文档中补充对应说明。
