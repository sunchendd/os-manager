# Multica Fork Ops Migration Design

## Goal

将当前 os-manager 仓库彻底替换为真正的 Multica fork 式二开仓，不再延续现有原型前后端实现；后续所有产品能力都建立在 Multica 原生的 workspace、issue、board、agent、runtime 结构上，并在其上增加面向服务器运维场景的 ops domain 扩展。

## Decision

采用真正的 Multica fork 式替换方案。

这意味着：

1. 当前仓不再继续演进现有 demo Web 应用。
2. 现有 os-manager 代码仅作为需求样本、交互参考和能力映射资产保留。
3. 新产品结构、页面入口、数据流和执行模型全部以 Multica 原工程形态为基准。

## Planning Prerequisite

在正式进入实现计划前，先执行一个短周期技术探针，目标不是开始交付功能，而是确认 Multica 二开落点：

1. 获取并落地 Multica 源码到当前仓替换后的主线。
2. 确认其前端、后端、数据库和 issue 相关代码的真实扩展点。
3. 确认第一阶段采用“外接 ops domain”而不是直接侵入式改造 issue 核心表结构。

该探针是实现计划的前置条件，不是额外产品阶段。

## Technical Spike Findings

技术探针已经得到以下结论，可作为后续实现计划输入：

### 1. Multica 目录与启动方式落点

Multica 当前是 Go backend + pnpm monorepo frontend：

1. `server/`：Go 后端，Chi router、sqlc、WebSocket
2. `apps/web/`：Next.js App Router 前端
3. `packages/core/`：React Query hooks、API client、client store 等无平台业务逻辑
4. `packages/views/`：共享业务页面与组件
5. `packages/ui/`：UI 组件层

本地开发启动方式明确为：

1. `make dev`：自动建 env、安装依赖、起 PostgreSQL、跑 migration、启动前后端
2. 后端默认 `http://localhost:8080`
3. 前端默认 `http://localhost:3000`

因此，当前仓替换后应直接接受 Multica 的 monorepo + Go backend 结构，而不是保留现有 Express + Vite 架构。

### 2. Issue 创建与详情扩展接缝

已确认的关键接缝：

1. 后端 issue 创建入口在 `server/internal/handler/issue.go` 的 `CreateIssue`
2. 后端 issue 详情入口在同文件的 `GetIssue`
3. 前端 issue 创建通过 `packages/core/issues/mutations.ts` 的 `useCreateIssue` 进入 API client
4. 前端 issue 详情主视图在 `packages/views/issues/components/issue-detail.tsx`

这意味着第一阶段的 ops 扩展不需要改动 board 或 runtime 主路径，只需在 issue create / detail 两个接缝上增加 ops context 读写即可。

### 3. Server Domain 建议落点

后端建议新增独立 domain：

1. `server/internal/handler/server.go` 或同级独立 handler 文件
2. `server/pkg/db/queries/` 新增 server 与 ops context SQL
3. `server/migrations/` 新增 server、server_metric_snapshot、issue_ops_context 表

前端建议新增两层：

1. `packages/core/servers/`：query keys、queries、mutations、types
2. `packages/views/servers/`：Servers 页面、Server Detail 页面、Ops composer 组件

应用路由层则挂到 `apps/web/` 的 workspace-scoped route 上，而不是放回 app-specific 业务实现里。

### 4. IssueOpsContext Side Table 可行性

side table 方案可行，理由如下：

1. Multica 的 issue 创建本身已使用事务，可在同一事务中追加 `IssueOpsContext` 写入。
2. `GetIssue` 当前已经会补充 reactions、attachments 等附加数据，说明 detail 接口适合继续拼装 ops context。
3. 前端 `IssueDetail` 已经有独立 sidebar/details 区块，适合挂 server context，不需要重写主页面骨架。

因此第一阶段默认采用：

1. `issue` 主表保持尽量不动
2. 新增 `issue_ops_context` side table
3. 在 create/get issue 接口中组合返回 ops 数据

### 5. 第一阶段资源快照策略

由于第一阶段明确不改 daemon 协议、不接 SSH 实采，资源快照采用后端占位数据源：

1. `server_metric_snapshot` 可由后端在创建服务器时初始化一份默认快照
2. 可提供手动刷新接口，返回演示用或规则生成的快照
3. UI 明确标注为“最新快照”而不是“实时监控”

该策略足以支撑 server detail 页面和 issue 侧栏展示，同时不会错误承诺已经完成真实采集。

## Why This Approach

1. 用户目标已经明确从“原型优化”转为“以 Multica 为底座二开”。
2. 当前仓历史极短，保留原型主线没有长期价值，反而会干扰后续与上游同步。
3. Multica 已经原生提供 issue 分配、board、agent 生命周期、runtime、实时执行流和 workspace 隔离；这些能力正是目标产品的基础设施，不应在原型仓中重复建设。
4. 如果继续在现有原型之上模仿 Multica，只会得到另一个“像 Multica 的 demo”，而不是可持续演进的二开底座。

## System Boundary

新系统分为两层：

### 1. Multica Core

保留并复用 Multica 原生能力：

1. workspace 隔离
2. issue 与 board 工作流
3. agent 分配与执行状态机
4. runtime / daemon 接入
5. comments 与 execution streaming
6. 用户、权限、设置等平台级能力

### 2. Ops Extension

新增服务器运维域能力：

1. server inventory
2. server metrics snapshot
3. issue 与 target server 绑定
4. SSH credential reference
5. ops task presets / intent metadata
6. 后续 Redfish / iBMC / install / rescue 扩展

边界约束如下：

1. Multica Core 不承担服务器运维语义，只负责通用协作与执行基础设施。
2. Ops Extension 不重建 issue、board、runtime，而是在现有基础设施上扩展运维语义和服务器上下文。

## Keep vs Extend

### Keep As-Is

优先保留 Multica 原生模块及交互：

1. workspace 页面和隔离模型
2. issue 列表、详情、board 视图
3. agent 配置、分配与执行生命周期
4. runtime / daemon 发现与管理
5. comments、status、streaming execution UI
6. 平台级设置与权限结构

### Extend

需要新增或适配的模块：

1. Server Domain
   - 服务器资产 CRUD
   - 按 workspace 隔离服务器
2. Issue Ops Context
   - issue 增加 targetServerId
   - issue 增加 opsIntent、riskLevel、executionMode
3. Server Detail View
   - 展示 CPU / memory / disk / GPU 空闲状态
   - 展示最近 issue 与执行关联
4. Ops Issue Composer
   - 创建 issue 时支持选择目标服务器
   - 提供运维模板或自然语言需求入口
5. Ops Agent Profile
   - 为特定 agent 标注其面向运维任务执行

### Extension Rule

第一阶段默认采用“独立 ops domain + 最小 core 接缝”策略：

1. 不直接改写 Multica issue 核心语义。
2. 对 issue 的运维扩展通过独立 `IssueOpsContext` 关联实体实现。
3. 如果 Multica 现有代码已经提供 metadata / custom field / side table 的扩展模式，则优先复用该模式。
4. 只有在技术探针确认完全没有可行扩展点时，才允许对 Multica issue 创建流做最小侵入改动。

## Phase 1 Scope

第一阶段仅交付以下能力：

1. 仓库和运行环境完全切为 Multica 工程形态。
2. 新增 Server 资产模型与基础 CRUD。
3. issue 可绑定到具体服务器。
4. 服务器详情页展示基础资源概览。
5. issue 执行上下文中可看到目标服务器信息。

### Explicitly Out of Scope

第一阶段明确不做：

1. 真实 SSH 远程执行
2. Redfish / iBMC 接入
3. 批量运维任务编排
4. daemon 协议级改造
5. 高风险硬件操作（风扇、RAID、装机介质管理）

第一阶段目标是把“Multica 原生协作流”和“server ops domain”真正连接起来，而不是一次性做完全部运维能力。

## UX Structure

首页不再保留现有 demo hero 和演示场景，而采用 Multica 风格主界面。

### Main Workspace Layout

推荐为三栏结构：

1. 左侧：Issue List 或 Board Column
2. 中间：当前 Issue 详情、评论、执行状态、agent 进度
3. 右侧：目标服务器摘要卡与资源概览

### New Navigation Entries

新增两类入口：

1. Servers
   - 服务器列表
   - 创建、编辑、删除服务器
   - 进入单台服务器详情页
2. New Ops Issue
   - 选择服务器
   - 选择模板或输入自然语言运维需求
   - 创建后仍然落入 Multica issue 系统

## Data Model

### Server

字段建议：

1. id
2. workspaceId
3. name
4. host
5. environment
6. sshUsername
7. credentialRef
8. tags
9. createdAt
10. updatedAt

### ServerMetricSnapshot

字段建议：

1. serverId
2. cpuIdlePercent
3. memoryFreePercent
4. diskFreePercent
5. gpuFreePercent
6. collectedAt

### IssueOpsContext

字段建议：

1. issueId
2. targetServerId
3. opsIntent
4. riskLevel
5. executionMode

### Schema Decision

第一阶段默认不把 `targetServerId`、`opsIntent` 等字段直接塞进 Multica 原生 issue 主表，而是通过 `IssueOpsContext` 独立表与 issue 做一对一或一对多关联。这样可以降低后续同步上游时的冲突面。

### Secret Handling Constraint

第一阶段即便还没有真正接入 Secret Store，也不建议把 SSH 密码作为长期明文字段保存在业务主表中。设计上应直接预留 `credentialRef`，便于后续切换到机密存储。

第一阶段凭据处理策略如下：

1. UI 可以录入连接配置，但持久化层只保存 `credentialRef` 或等价的引用标识。
2. 如果第一阶段暂时没有 Secret Store，则允许使用开发环境占位 provider，保存“引用对象”而不是明文密码主字段。
3. 第一阶段不验证 SSH 可连通性，只验证凭据引用格式、归属 workspace 和可解析性。

## Data Flow

第一阶段目标数据流如下：

1. 用户在 Multica workspace 中创建新的 ops issue。
2. 创建 issue 时选择目标服务器并填写需求。
3. issue 保存到原生 issue 系统，同时写入 ops context。
4. issue 被分配给 agent 后，执行界面可读取目标服务器上下文。
5. issue 详情右侧展示服务器摘要和最新资源快照。
6. 服务器详情页可以反向看到与该服务器相关的 issues。

其中第 5 步的资源快照在第一阶段默认来自演示/占位数据源，而不是 SSH 实采或 daemon 协议扩展。

## Migration Strategy

迁移顺序固定如下：

1. 用 Multica 工程替换当前仓主体内容。
2. 跑通 Multica 原生开发环境与基础页面。
3. 梳理哪些目录属于 upstream 保留区，哪些目录适合作为二开扩展点。
4. 新增 server domain 与 issue binding。
5. 新增 server detail / metrics 页面。
6. 新增 ops issue composer。
7. 补最小测试闭环与文档。

### Technical Spike Outputs

技术探针结束时必须产出以下结论，之后才能写实现计划：

1. Multica 代码目录与启动方式落点
2. issue 创建与详情流的真实扩展点
3. server domain 更适合落在哪个后端模块和前端路由层
4. `IssueOpsContext` 是否可以完全以 side table 形式实现
5. 第一阶段资源快照的占位数据来源与刷新方式

## Error Handling

第一阶段的错误处理重点：

1. 未绑定服务器的普通 issue 保持 Multica 原生行为，不强制要求 ops context。
2. 目标服务器不存在或无权限访问时，issue 详情中显示明确绑定错误。
3. 服务器资源快照缺失时，展示“无可用监控数据”而非阻断 issue 流程。
4. ops 扩展失败不应影响 Multica 核心 issue/board 可用性。
5. 凭据引用失效时，只阻断 ops 扩展区域，不破坏 issue 主流程。

## Testing Strategy

测试分三层：

1. 数据层测试
   - server CRUD
   - issue 与 server 绑定关系
2. API / integration 测试
   - 创建 ops issue
   - issue 详情加载 server context
   - server detail 反查关联 issues
3. UI 测试
   - 新建 ops issue 流程
   - server detail 资源展示
   - issue 详情中的 target server 侧栏显示

此外，替换到底座后还应纳入 Multica 原生测试基线，避免 ops 扩展破坏其现有 issue/board 行为。

## Non-Goals

以下目标不属于本次设计：

1. 在当前原型仓上继续优化旧版 Web UI
2. 继续扩展现有 Express + Vite demo 架构
3. 在没有切换到底座前先实现更多服务器运维功能

## Implementation Readiness

该设计已经明确：

1. 仓库级替换方向
2. Core 与 ops extension 的边界
3. 第一阶段可交付范围
4. 页面结构与数据模型
5. 迁移顺序与测试重点

进入实现计划前唯一剩余前置动作，是完成上文定义的技术探针并把其结论补入计划文档。

下一步应基于该 spec 生成实现计划，重点围绕“如何把当前仓替成 Multica 工程并落下第一阶段 ops 扩展”展开。