# Socket.IO 通信协议

## 1. 连接建立

### 连接地址
- URL: `http://localhost:3000/classroom`
- 认证: 握手验证（无JWT）

### 握手验证
```javascript
// 学生连接
const socket = io('http://localhost:3000/classroom', {
  auth: {
    role: 'student',
    classNo: '502',
    studentNo: 1,
    groupNo: 1,
    pin4: '1234'
  }
});

// 教师连接
const socket = io('http://localhost:3000/classroom', {
  auth: {
    role: 'teacher',
    username: 'admin',
    password: 'bgxx2025'
  }
});
```
## 2. 核心事件

### 状态通知
```javascript
// 用户上线/下线
socket.on('user_online', (data) => {
  // { user: {...}, status: 'online', timestamp }
});

socket.on('user_offline', (data) => {
  // { user: {...}, status: 'offline', timestamp }
});

// 心跳检测
socket.emit('ping');
socket.on('pong', (data) => {
  // { timestamp }
});
```

### 消息通信
```javascript
// 发送消息
socket.emit('message', {
  from: { classNo: '502', groupNo: 1, studentNo: 1 },
  to: { groupNo: 0, studentNo: 0 },  // 发给教师
  data: { type: 'homework', content: '作业内容' }
});

// 接收消息
socket.on('message', (msg) => {
  // { code: 200, from: {...}, to: {...}, data: {...}, at: timestamp }
});
```



## 3. 房间管理

### 自动房间分配
**教师：** `teacher`, `all`  
**学生：** `student`, `student:12345`, `group:1`

## 4. 消息路由

**教师发送：**
- 广播所有学生：`to: { broadcast: true }`
- 特定学生：`to: { studentNo: 12345 }`
- 特定小组：`to: { groupNo: 1 }`

**学生发送：**
- 发给教师：`to: { groupNo: 0, studentNo: 0 }`
- 发给其他学生：`to: { studentNo: 54321 }`
- 发给小组：`to: { groupNo: 2 }`

## 5. 使用示例

```javascript
// 学生连接
const socket = io('http://localhost:3000/classroom', {
  auth: { role: 'student', classNo: '502', studentNo: 1, groupNo: 1, pin4: '1234' }
});

socket.on('authenticated', (data) => {
  // 认证成功，发送作业
  socket.emit('message', {
    from: { classNo: '502', groupNo: 1, studentNo: 1 },
    to: { groupNo: 0, studentNo: 0 },
    data: { type: 'homework', content: '我的作业' }
  });
});

socket.on('connect_error', (error) => {
  console.error('认证失败:', error.message);
});
```

```javascript
// 教师连接
const socket = io('http://localhost:3000/classroom', {
  auth: { role: 'teacher', username: 'admin', password: 'bgxx2025' }
});

socket.on('authenticated', () => {
  // 向所有学生广播
  socket.emit('message', {
    from: { groupNo: 0, studentNo: 0 },
    to: { broadcast: true },
    data: { type: 'announcement', content: '开始上课' }
  });
});
```