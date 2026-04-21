# Multica Fork Ops Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 os-manager 仓库替换为真正的 Multica 工程底座，并在其上完成第一阶段 ops 扩展：Server 资产、Issue 绑定目标服务器、Server Detail 资源概览。

**Architecture:** 先把仓库主体切换为 Multica 的 Go backend + pnpm monorepo frontend，再以最小侵入方式在 issue create/detail 接缝上追加 `IssueOpsContext`，并新增独立 `Server` domain。第一阶段坚持 side table 扩展、占位资源快照、无真实 SSH/daemon 协议改造。

**Tech Stack:** Multica monorepo, Next.js App Router, Go (Chi + sqlc + WebSocket), PostgreSQL, TanStack Query, Zustand, Vitest, Go tests

**Prerequisite Input:** `docs/superpowers/specs/2026-04-20-multica-fork-ops-migration-design.md` 已包含完成后的技术探针结论；本计划默认这些结论已经成立，执行从仓库替换开始，不重复做探针任务。

---

## Planned File Structure

### Preserve

- `docs/superpowers/specs/2026-04-20-multica-fork-ops-migration-design.md` — 当前设计 spec
- `docs/superpowers/plans/2026-04-20-multica-fork-ops-phase1.md` — 当前实现计划
- `.github/copilot-instructions.md` — 当前工作区指令文件，替仓时必须保留
- `timu.md` — 原需求材料，保留为参考输入

### Replace With Multica Upstream Layout

- `apps/web/` — Next.js web app
- `apps/desktop/` — Electron desktop app
- `packages/core/` — API client、query hooks、stores、types
- `packages/views/` — 共享业务页面与组件
- `packages/ui/` — UI 组件
- `server/` — Go backend + migrations + sql queries + handlers
- `pnpm-workspace.yaml` / `turbo.json` / `Makefile` — monorepo 与本地开发入口

### New Ops Extension Units

- `server/migrations/*_create_servers.*.sql` — Server / ServerMetricSnapshot / IssueOpsContext 表
- `server/pkg/db/queries/server.sql` — Server 相关 SQL
- `server/pkg/db/queries/issue_ops_context.sql` — Issue 绑定 server 的 SQL
- `server/internal/handler/server.go` — Server CRUD + metrics handler
- `packages/core/servers/types.ts` — Server domain 类型
- `packages/core/servers/queries.ts` — Server query keys 与 queryOptions
- `packages/core/servers/mutations.ts` — Server mutation hooks
- `packages/core/servers/index.ts` — servers barrel
- `packages/views/servers/components/servers-page.tsx` — Server 列表页
- `packages/views/servers/components/server-detail-page.tsx` — Server 详情页
- `packages/views/servers/components/server-form.tsx` — Server 新建/编辑表单
- `packages/views/issues/components/issue-server-sidebar.tsx` — Issue detail 右侧 server context 区块
- `packages/views/modals/create-issue.tsx` — 直接在现有 create issue 流程中扩展 ops composer
- `apps/web/app/[workspaceSlug]/servers/page.tsx` — Servers 路由
- `apps/web/app/[workspaceSlug]/servers/[id]/page.tsx` — Server detail 路由

---

### Task 1: Replace Repository With Multica Baseline

**Files:**
- Preserve: `docs/superpowers/specs/2026-04-20-multica-fork-ops-migration-design.md`
- Preserve: `docs/superpowers/plans/2026-04-20-multica-fork-ops-phase1.md`
- Preserve: `.github/copilot-instructions.md`
- Preserve: `timu.md`
- Delete/Replace: `src/`
- Delete/Replace: `tests/`
- Delete/Replace: `web/`
- Delete/Replace: root `package.json`, `tsconfig*.json`, Vite-era config files
- Add upstream layout: `apps/`, `packages/`, `server/`, `pnpm-workspace.yaml`, `turbo.json`, `Makefile`

- [ ] **Step 1: Snapshot the current prototype-only assets that must survive replacement**

Create a small archive note before deleting old code:

```md
# Prototype Archive

Keep only these files as reference inputs:
- docs/superpowers/specs/2026-04-20-multica-fork-ops-migration-design.md
- docs/superpowers/plans/2026-04-20-multica-fork-ops-phase1.md
- .github/copilot-instructions.md
- timu.md
```

- [ ] **Step 2: Fetch the Multica upstream source into a temporary sibling directory**

Run:

```bash
git clone https://github.com/multica-ai/multica.git ../multica-upstream
```

Expected: clone succeeds and `../multica-upstream` contains `apps/`, `packages/`, `server/`, `Makefile`.

- [ ] **Step 3: Replace the current product code with the upstream Multica tree**

Preserve `docs/superpowers/` and `timu.md`, remove the prototype app code, then copy in:

```bash
rsync -a --delete \
  --exclude '.git' \
    --exclude '.github' \
  --exclude 'docs/superpowers' \
  --exclude 'timu.md' \
  ../multica-upstream/ ./
```

After rsync, restore or keep `.github/copilot-instructions.md` in place.

- [ ] **Step 4: Verify the new repository shape before touching ops features**

Run:

```bash
ls apps packages server Makefile pnpm-workspace.yaml turbo.json
```

Expected: all listed paths exist.

- [ ] **Step 5: Run the baseline Multica stack to verify the replacement worked**

Run:

```bash
make dev
```

Expected: frontend on `http://localhost:3000`, backend on `http://localhost:8080`, migrations applied.

- [ ] **Step 6: Run baseline verification before any customization**

Run:

```bash
make check
```

Expected: Multica upstream baseline checks pass in the replaced repository.

### Task 2: Add Database Schema For Servers And Issue Ops Context

**Files:**
- Create: `server/migrations/xxx_create_servers.up.sql`
- Create: `server/migrations/xxx_create_servers.down.sql`
- Create: `server/pkg/db/queries/server.sql`
- Create: `server/pkg/db/queries/issue_ops_context.sql`
- Regenerate: `server/pkg/db/generated/*`
- Test: `server/internal/handler/handler_test.go`

- [ ] **Step 1: Write the failing backend test for server CRUD**

Add a Go test that creates a workspace-scoped server, lists it back, and verifies no plaintext password field is persisted or returned.

```go
func TestServerCRUD(t *testing.T) {
    w := httptest.NewRecorder()
    req := newRequest("POST", "/api/servers?workspace_id="+testWorkspaceID, map[string]any{
        "name": "prod-node-01",
        "host": "10.0.0.12",
        "environment": "prod",
        "ssh_username": "root",
        "credential_ref": "cred-dev-1",
    })
    testHandler.CreateServer(w, req)
    if w.Code != http.StatusCreated {
        t.Fatalf("CreateServer: expected 201, got %d: %s", w.Code, w.Body.String())
    }

    if strings.Contains(w.Body.String(), "password") {
        t.Fatalf("CreateServer: response must not contain plaintext password fields")
    }
}
```

- [ ] **Step 2: Run the focused Go test and verify it fails**

Run:

```bash
cd server && go test ./internal/handler -run TestServerCRUD -v
```

Expected: FAIL because `CreateServer` and related schema do not exist.

- [ ] **Step 3: Add the migration for `server`, `server_metric_snapshot`, and `issue_ops_context`**

Schema requirements:

1. `server`
   - `id`, `workspace_id`, `name`, `host`, `environment`, `ssh_username`, `credential_ref`, `tags`, timestamps
2. `server_metric_snapshot`
   - `id`, `server_id`, 4 metric columns, `collected_at`
3. `issue_ops_context`
   - `id`, `issue_id`, `target_server_id`, `ops_intent`, `risk_level`, `execution_mode`, timestamps
4. FK rules:
   - server belongs to workspace
   - issue ops context references issue + server

Workspace isolation rules:

1. every server query must filter by `workspace_id`
2. every issue ops context write must verify both issue and server belong to the same workspace
3. server list/detail/update/delete handlers must reject cross-workspace access with a not-found or permission-safe error

Credential rule:

1. do not add plaintext SSH password columns to the `server` table
2. persist only `credential_ref`
3. `credential_ref` format in phase 1 should use a namespaced pattern such as `cred:<workspace-id>:<slug>` so later migration to a secret store remains mechanical

- [ ] **Step 4: Add SQL queries and regenerate sqlc code**

Run:

```bash
make sqlc
```

Expected: generated query code includes server and issue ops context methods.

- [ ] **Step 5: Implement minimal server CRUD handler plumbing**

Create `server/internal/handler/server.go` with:

1. `CreateServer`
2. `ListServers`
3. `GetServer`
4. `UpdateServer`
5. `DeleteServer`

- [ ] **Step 6: Re-run the focused Go test and verify it passes**

Run:

```bash
cd server && go test ./internal/handler -run TestServerCRUD -v
```

Expected: PASS.

### Task 3: Expose Server API And Placeholder Metrics

**Files:**
- Modify: `server/internal/handler/server.go`
- Modify: `server/cmd/server/router.go`
- Modify: `server/pkg/db/queries/server.sql`
- Regenerate: `server/pkg/db/generated/*`
- Test: `server/internal/handler/handler_test.go`

- [ ] **Step 1: Write the failing backend test for server metrics**

```go
func TestGetServerMetrics(t *testing.T) {
    // create server first
    // GET /api/servers/{id}/metrics should return placeholder snapshot
}
```

Assert the response includes numeric `cpu_idle_percent`, `memory_free_percent`, `disk_free_percent`, `gpu_free_percent` and that values follow a deterministic demo range.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd server && go test ./internal/handler -run TestGetServerMetrics -v
```

Expected: FAIL because metrics endpoint does not exist.

- [ ] **Step 3: Add placeholder metric generation strategy**

Implement minimal behavior:

1. when server is created, seed one snapshot row
2. `GET /api/servers/{id}/metrics` returns latest snapshot
3. `POST /api/servers/{id}/metrics/refresh` creates a new deterministic demo snapshot
4. deterministic demo snapshot rule: values must be derived from `hash(server_id + metric_name + refresh_count)` and clamped to explicit ranges:
    - CPU idle: `35-90`
    - Memory free: `20-85`
    - Disk free: `25-92`
    - GPU free: `0-100`
5. never use non-deterministic random sources like `math/rand` without a fixed seed

- [ ] **Step 4: Wire routes in `server/cmd/server/router.go`**

Add:

1. `GET /api/servers`
2. `POST /api/servers`
3. `GET /api/servers/{id}`
4. `PATCH /api/servers/{id}`
5. `DELETE /api/servers/{id}`
6. `GET /api/servers/{id}/metrics`
7. `POST /api/servers/{id}/metrics/refresh`

- [ ] **Step 5: Re-run the metrics test and verify it passes**

Run:

```bash
cd server && go test ./internal/handler -run TestGetServerMetrics -v
```

Expected: PASS.

### Task 4: Add Core Frontend Server Domain

**Files:**
- Create: `packages/core/servers/types.ts`
- Create: `packages/core/servers/queries.ts`
- Create: `packages/core/servers/mutations.ts`
- Create: `packages/core/servers/index.ts`
- Modify: `packages/core/api/client.ts`
- Test: `packages/core/servers/*.test.ts` or existing Vitest domain tests

- [ ] **Step 1: Write the failing TypeScript test for server query/mutation contracts**

Cover:

1. list servers query key shape
2. create server mutation calls API client with workspace context
3. get server metrics query exists

- [ ] **Step 2: Run the focused TS test and verify it fails**

Run:

```bash
pnpm test -- --run packages/core/servers
```

Expected: FAIL because the domain files do not exist.

- [ ] **Step 3: Add API client methods in `packages/core/api/client.ts`**

Add:

1. `listServers(workspaceId)`
2. `getServer(id)`
3. `createServer(data)`
4. `updateServer(id, data)`
5. `deleteServer(id)`
6. `getServerMetrics(id)`

- [ ] **Step 4: Implement `packages/core/servers/*`**

Create focused files for types, query keys, queryOptions, mutations, and barrel exports.

- [ ] **Step 5: Re-run the focused TS test and verify it passes**

Run:

```bash
pnpm test -- --run packages/core/servers
```

Expected: PASS.

### Task 5: Add Servers Navigation And Pages

**Files:**
- Modify: `packages/views/layout/app-sidebar.tsx`
- Create: `packages/views/servers/components/servers-page.tsx`
- Create: `packages/views/servers/components/server-detail-page.tsx`
- Create: `packages/views/servers/components/server-form.tsx`
- Create: `packages/views/servers/index.ts`
- Create: `apps/web/app/[workspaceSlug]/servers/page.tsx`
- Create: `apps/web/app/[workspaceSlug]/servers/[id]/page.tsx`
- Test: corresponding frontend component/page tests

- [ ] **Step 1: Write the failing UI test for Servers navigation**

The test should assert:

1. sidebar contains `Servers`
2. clicking it navigates to the Servers page
3. server list renders workspace-scoped rows

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run:

```bash
pnpm test -- --run servers-page
```

Expected: FAIL because Servers nav/page do not exist.

- [ ] **Step 3: Add `Servers` to the workspace sidebar**

Modify `packages/views/layout/app-sidebar.tsx` to add a workspace-scoped item.

- [ ] **Step 4: Implement the Servers list page and form**

Page requirements:

1. list workspace servers
2. create/edit/delete server
3. open detail page

- [ ] **Step 5: Add the Next.js workspace routes**

Create route files under `apps/web/app/[workspaceSlug]/servers/...` as thin wrappers only.

- [ ] **Step 6: Re-run the focused UI test and verify it passes**

Run:

```bash
pnpm test -- --run servers-page
```

Expected: PASS.

### Task 6: Bind Issues To Target Servers Via Side Table

**Files:**
- Modify: `server/internal/handler/issue.go`
- Modify: `server/pkg/db/queries/issue_ops_context.sql`
- Regenerate: `server/pkg/db/generated/*`
- Modify: `packages/core/api/client.ts`
- Modify: `packages/core/types/*` if issue response types live there
- Test: `server/internal/handler/handler_test.go`
- Test: frontend issue creation/detail tests

- [ ] **Step 1: Write the failing backend test for ops issue creation**

Test shape:

```go
func TestCreateOpsIssueBindsTargetServer(t *testing.T) {
    // create server first
    // POST /api/issues with target_server_id + ops_intent
    // assert issue created and detail response includes ops context
}
```

- [ ] **Step 2: Run the focused Go test and verify it fails**

Run:

```bash
cd server && go test ./internal/handler -run TestCreateOpsIssueBindsTargetServer -v
```

Expected: FAIL because issue create/detail do not include ops context.

- [ ] **Step 3: Extend `CreateIssue` with optional ops payload**

Minimal contract:

1. normal issues remain valid without ops fields
2. when ops fields are present, write `issue_ops_context` in the same transaction
3. reject invalid server IDs outside the current workspace
4. missing or invalid `credential_ref` must not break plain non-ops issue creation
5. if a referenced server has been deleted or is unavailable, `GetIssue` must return an ops context error state instead of crashing the native issue payload

- [ ] **Step 4: Extend `GetIssue` to compose ops context into the response**

Return shape should include:

1. target server summary
2. ops intent
3. risk level
4. execution mode
5. clear error state or null ops section for native non-ops issues

- [ ] **Step 5: Regenerate sqlc and re-run the backend test**

Run:

```bash
make sqlc
cd server && go test ./internal/handler -run TestCreateOpsIssueBindsTargetServer -v
```

Expected: PASS.

### Task 7: Add Ops Issue Composer And Issue Detail Server Sidebar

**Files:**
- Modify: `packages/views/modals/create-issue.tsx`
- Create: `packages/views/issues/components/issue-server-sidebar.tsx`
- Modify: `packages/views/issues/components/issue-detail.tsx`
- Test: frontend component tests around create issue + issue detail

- [ ] **Step 1: Write the failing UI test for creating an ops issue**

The test should assert:

1. user can pick a target server in the issue creation flow
2. submit includes target server + ops intent
3. issue detail sidebar shows the bound server

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run:

```bash
pnpm test -- --run ops-issue
```

Expected: FAIL because the composer/sidebar do not exist.

- [ ] **Step 3: Extend the issue creation UI with ops fields**

Minimum fields:

1. target server
2. ops intent / natural language requirement
3. optional risk / execution mode defaulting logic
4. keep the existing issue creation entry point instead of creating a second composer, so native issue flow and ops issue flow stay in one modal with an optional server section

- [ ] **Step 4: Add `IssueServerSidebar` to `issue-detail.tsx`**

Mount it in the existing detail sidebar/details area instead of changing the main activity layout.

- [ ] **Step 5: Re-run the focused UI test and verify it passes**

Run:

```bash
pnpm test -- --run ops-issue
```

Expected: PASS.

### Task 8: Add Server Detail Cross-Linking To Related Issues

**Files:**
- Modify: `server/internal/handler/server.go`
- Modify: `server/pkg/db/queries/server.sql`
- Regenerate: `server/pkg/db/generated/*`
- Modify: `packages/core/servers/queries.ts`
- Modify: `packages/views/servers/components/server-detail-page.tsx`
- Test: backend + frontend tests for related issues rendering

- [ ] **Step 1: Write the failing test for related issues on server detail**

Assert that a server detail response or page can show issues bound to that server.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm test -- --run server-detail
```

Expected: FAIL because related issues are not loaded.

- [ ] **Step 3: Add backend query for issues by target server**

This should read via `issue_ops_context` join, scoped by workspace.

Query rule:

1. join in one query rather than per-issue lookups
2. include pagination or an explicit limit for the first phase
3. apply workspace membership and workspace_id filtering before returning rows

- [ ] **Step 4: Render related issues in `server-detail-page.tsx`**

Minimum rendering:

1. issue identifier
2. title
3. status
4. link to issue detail

- [ ] **Step 5: Re-run the focused test and verify it passes**

Run:

```bash
pnpm test -- --run server-detail
```

Expected: PASS.

### Task 9: Add Multica Compatibility Regression Coverage

**Files:**
- Modify: existing issue/board tests in the replaced Multica frontend test suites
- Modify: existing Go handler/integration tests where issue CRUD and issue detail already exist

- [ ] **Step 1: Write a regression test for native issue creation without ops fields**

Assert that a normal issue still creates successfully and does not require server context.

- [ ] **Step 2: Write a regression test for issue detail rendering without server sidebar content**

Assert that non-ops issues still render the existing Multica detail layout without errors.

- [ ] **Step 3: Write a regression test for issue list/board behavior**

Assert that adding ops context does not remove or corrupt normal issue cards in list/board views.

- [ ] **Step 4: Write a regression test for workspace permission denial**

Assert that a user cannot read or bind a server from another workspace.

- [ ] **Step 5: Run the regression suite and verify it fails first**

Run:

```bash
pnpm test -- --run issues
cd server && go test ./internal/handler -run 'TestIssueCRUD|TestCreateOpsIssueBindsTargetServer' -v
```

Expected: at least the newly added regression or ops-context test fails before implementation is complete.

- [ ] **Step 6: Re-run the same regression suite after implementation and verify it passes**

Expected: PASS for both native and ops-enhanced issue flows.

### Task 10: Full Verification And Product Smoke Test

**Files:**
- Modify as needed: `README.md` or Multica docs entry if local customization instructions are required
- Verify: entire repository

- [ ] **Step 1: Run all TypeScript tests**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run all Go tests**

Run:

```bash
make test
```

Expected: PASS.

- [ ] **Step 3: Run full repository checks**

Run:

```bash
make check
```

Expected: PASS.

- [ ] **Step 4: Run a manual smoke test with local dev stack**

Run:

```bash
make dev
```

Manual assertions:

1. workspace can open normally
2. sidebar contains `Servers`
3. can create a server
4. can create an ops issue bound to that server
5. issue detail sidebar shows the target server and resource snapshot
6. server detail page shows the related issue
7. a normal issue without target server still behaves like native Multica

- [ ] **Step 5: Document local customization entry points**

Update repo docs to explain:

1. where the ops extension lives
2. which files are intended for future server/SSH/BMC evolution
3. that phase 1 metrics are placeholder snapshots, not real telemetry

---

## Plan Exit Criteria

The plan is complete when all of the following are true:

1. Current repository no longer boots the old Express + Vite prototype.
2. Current repository boots a real Multica codebase.
3. Workspace sidebar contains a `Servers` entry.
4. A user can create a server asset.
5. A user can create an issue bound to a target server.
6. Issue detail shows server context in the sidebar.
7. Server detail shows placeholder metrics and linked issues.
8. Upstream-style verification (`pnpm test`, `make test`, `make check`) passes.
