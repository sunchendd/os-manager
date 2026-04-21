# Multica-Style Ops Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前原型仓先实现可迁移到 Multica 的第一阶段闭环：服务器资产 CRUD、SSH 信息录入、资源概览和按服务器提交 issue 式任务。

**Architecture:** 后端在现有 Express API 上新增内存态服务器资产仓储与资源概览接口，前端在现有单页上新增服务器看板和目标服务器选择器。任务规划接口继续复用现有规划器，但请求体增加 `serverId`，让“问题提交到具体服务器”先跑通。

**Tech Stack:** TypeScript, Express, React, Vite, Vitest, Testing Library, Supertest

---

### Task 1: Add Server Asset API

**Files:**
- Create: `src/server/core/server-assets.ts`
- Modify: `src/server/core/types.ts`
- Modify: `src/server/api/routes.ts`
- Test: `tests/api.test.ts`

- [ ] **Step 1: Write the failing API tests**

在 `tests/api.test.ts` 增加：

```ts
test('creates and lists server assets', async () => {
  const app = createApp();

  const createResponse = await request(app).post('/api/servers').send({
    name: 'prod-node-01',
    host: '10.0.0.12',
    environment: 'prod',
    sshUsername: 'root',
    sshPassword: 'secret'
  });

  expect(createResponse.status).toBe(201);

  const listResponse = await request(app).get('/api/servers');
  expect(listResponse.body.servers).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api.test.ts`
Expected: FAIL because `/api/servers` does not exist.

- [ ] **Step 3: Write minimal implementation**

实现：

1. `ServerAsset`、`ServerMetricsSnapshot` 类型
2. 内存态 `server-assets.ts` 仓储
3. `GET /api/servers`
4. `POST /api/servers`
5. `PUT /api/servers/:id`
6. `DELETE /api/servers/:id`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api.test.ts`
Expected: PASS

### Task 2: Add Server Metrics and Server-Scoped Planning

**Files:**
- Modify: `src/server/core/types.ts`
- Modify: `src/server/api/routes.ts`
- Test: `tests/api.test.ts`

- [ ] **Step 1: Write the failing API tests**

在 `tests/api.test.ts` 增加：

```ts
test('returns server metrics and accepts serverId in plan requests', async () => {
  const app = createApp();

  const createResponse = await request(app).post('/api/servers').send({
    name: 'gpu-node',
    host: '10.0.0.33',
    environment: 'lab',
    sshUsername: 'ubuntu',
    sshPassword: 'secret'
  });

  const serverId = createResponse.body.server.id;

  const metricsResponse = await request(app).get(`/api/servers/${serverId}/metrics`);
  expect(metricsResponse.status).toBe(200);
  expect(metricsResponse.body.metrics.cpuIdlePercent).toBeTypeOf('number');

  const planResponse = await request(app)
    .post('/api/plan')
    .send({ input: '查询当前磁盘剩余空间', osRelease: 'ID=ubuntu\nNAME="Ubuntu"\n', serverId });

  expect(planResponse.status).toBe(200);
  expect(planResponse.body.server.id).toBe(serverId);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api.test.ts`
Expected: FAIL because metrics route and `server` payload are missing.

- [ ] **Step 3: Write minimal implementation**

实现：

1. `GET /api/servers/:id/metrics`
2. 为 `POST /api/plan` 和 `POST /api/execute` 增加 `serverId` 解析
3. 返回绑定的 `server` 信息

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api.test.ts`
Expected: PASS

### Task 3: Add Frontend Server Dashboard

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.test.tsx`
- Modify: `web/src/styles.css`

- [ ] **Step 1: Write the failing UI tests**

在 `web/src/App.test.tsx` 增加：

```ts
test('creates a server asset and selects it as task target', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ servers: [] }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        server: {
          id: 'server-1',
          name: 'prod-node-01',
          host: '10.0.0.12',
          environment: 'prod',
          sshUsername: 'root',
          metrics: {
            cpuIdlePercent: 63,
            memoryFreePercent: 48,
            diskFreePercent: 71,
            gpuFreePercent: 100
          }
        }
      })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ servers: [{ id: 'server-1', name: 'prod-node-01', host: '10.0.0.12', environment: 'prod', sshUsername: 'root', metrics: { cpuIdlePercent: 63, memoryFreePercent: 48, diskFreePercent: 71, gpuFreePercent: 100 } }] })
    });

  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  await userEvent.type(screen.getByLabelText('server-name'), 'prod-node-01');
  await userEvent.type(screen.getByLabelText('server-host'), '10.0.0.12');
  await userEvent.type(screen.getByLabelText('server-user'), 'root');
  await userEvent.type(screen.getByLabelText('server-password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: '保存服务器' }));

  await waitFor(() => {
    expect(screen.getByText('prod-node-01')).toBeInTheDocument();
  });

  await userEvent.click(screen.getByRole('button', { name: '设为任务目标：prod-node-01' }));
  expect(screen.getByText('当前目标服务器: prod-node-01')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- web/src/App.test.tsx`
Expected: FAIL because the server dashboard UI does not exist.

- [ ] **Step 3: Write minimal implementation**

实现：

1. 页面加载时拉取 `/api/servers`
2. 新增服务器表单：名称、主机、环境、SSH 用户名、SSH 密码
3. 新增服务器列表
4. 新增资源概览卡片：CPU、内存、磁盘、显卡空闲率
5. 新增“设为任务目标”按钮，并在 `/api/plan`、`/api/execute` 请求里带上 `serverId`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- web/src/App.test.tsx`
Expected: PASS

### Task 4: Documentation and Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update documentation**

补充：

1. 服务器资产管理能力
2. SSH 信息录入
3. 资源概览和按服务器提任务

- [ ] **Step 2: Run full verification**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Run build verification**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Start development service**

Run: `npm run dev`
Expected: frontend and backend both start successfully