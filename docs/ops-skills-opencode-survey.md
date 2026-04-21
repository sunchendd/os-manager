# 运维 Skills 与 OpenCode 调研

## 1. 已安装到当前目录的 skills

这些 skills 已经安装到当前项目目录下的 `.agents/skills/`，并且安装结果显示同时支持 OpenCode：

1. `.agents/skills/openclaw-secure-linux-cloud`
2. `.agents/skills/secure-linux-web-hosting`
3. `.agents/skills/centos-linux-triage`
4. `.agents/skills/debian-linux-triage`
5. `.agents/skills/fedora-linux-triage`

### 适用场景

#### 1. openclaw-secure-linux-cloud

适合：

1. 远程 Linux 主机安全接入
2. SSH tunnel / Tailscale / 反向代理的安全选型
3. OpenClaw 或类似远程 Agent 控制面的安全暴露方式

可借鉴点：

1. 默认私有控制面
2. 先 SSH 隧道，再逐步开放访问
3. 先缩小工具权限，再按需放开

#### 2. secure-linux-web-hosting

适合：

1. Linux 主机基线加固
2. SSH、Nginx、HTTPS、Firewall 标准化流程
3. 面向云主机的上线前验证清单

可借鉴点：

1. 把“本地动作”和“服务器动作”严格分开
2. 每一步都带验证命令
3. 先确认安全访问，再做服务暴露

#### 3. centos/debian/fedora-linux-triage

适合：

1. 多发行版问题定位
2. systemd、journalctl、dnf/yum/apt 维度排障
3. 防火墙与 SELinux 相关问题排查

可借鉴点：

1. 每次处理都要求明确环境信息
2. 每次修复都带验证步骤
3. 每次变更都带 rollback/cleanup

### 当前缺口

目前没有直接命中这些关键词的 skill：

1. `ibmc`
2. `redfish`
3. `bmc`
4. 通用“服务器管理看板”

结论：

现有 skill 可以覆盖 Linux 安全、发行版排障和远程接入基线，但 **iBMC/Redfish 需要你自己补一个项目内 skill 或 MCP 工具层**。

## 2. 建议继续补的 skill 方向

如果你准备继续扩展，建议新增 3 类项目内 skill：

1. `ibmc-redfish-ops`
   负责电源控制、虚拟介质、传感器、事件日志、用户管理
2. `multi-distro-package-mirror`
   负责 openEuler / CentOS / Ubuntu 的 yum/dnf/apt/pip 源切换
3. `ops-investigation-playbook`
   负责磁盘、网络、进程、端口、服务故障的标准排查路径

## 3. 值得借鉴的开源项目

### 3.1 服务器管理 / 堡垒机 / Web 终端

#### 1. JumpServer

仓库：`jumpserver/jumpserver`

链接：<https://github.com/jumpserver/jumpserver>

适合借鉴：

1. 资产管理
2. Web 终端
3. 审计录像
4. 权限控制
5. 多协议接入：SSH、RDP、Kubernetes、Database

你最该借鉴的点：

1. “资产” 和 “会话” 分层
2. 操作审计与回放
3. 管理台 + 终端 + 权限模型的组合方式

#### 2. Cockpit

仓库：`cockpit-project/cockpit`

链接：<https://github.com/cockpit-project/cockpit>

适合借鉴：

1. 服务器状态看板
2. 日志、网络、存储、容器管理
3. 多主机切换
4. Web 与真实 Linux 会话的融合

你最该借鉴的点：

1. 看板布局
2. “状态卡片 + 操作页 + 日志页” 的信息组织
3. 通过 SSH 管理多台机器的交互路径

#### 3. Webterminal

仓库：`jimmy201602/webterminal`

链接：<https://github.com/jimmy201602/webterminal>

适合借鉴：

1. Web SSH / SFTP / RDP / VNC
2. 命令审计
3. 文件管理
4. 脚本执行

你最该借鉴的点：

1. Web 终端接入方式
2. 审计与权限控制思路
3. “常见操作 + 远程连接 + 文件浏览” 合在一起的体验

### 3.2 BMC / Redfish / iBMC 方向

#### 1. OpenBMC bmcweb

仓库：`openbmc/bmcweb`

链接：<https://github.com/openbmc/bmcweb>

适合借鉴：

1. Redfish API
2. KVM over WebSocket
3. 串口控制台
4. 认证与权限模型

你最该借鉴的点：

1. Redfish 到后端对象模型的映射
2. KVM / Serial / Redfish 的统一 Web 入口
3. 认证机制设计

#### 2. OpenBMC 生态项目

补充候选：

1. `openbmc/bmcweb`
2. `vtsynergy/openbmc-redfish`
3. `ami-megarac/MORF-OpenBMC`

说明：

这些项目更偏 BMC 固件或协议实现，不像 JumpServer/Cockpit 那样直接给你一个现代管理台，但非常适合拿来理解 Redfish 和 BMC 能力边界。

## 4. 管理看板建议怎么做

你提的“管理看板”很有价值，而且和比赛方向高度一致。我建议不要把它做成纯聊天页，而是做成三栏式控制台。

### 推荐信息结构

#### 左栏：资产列表

显示：

1. 服务器名称
2. IP / 机房 / 环境
3. 发行版
4. 在线状态
5. SSH 状态
6. iBMC 状态

#### 中栏：任务与常见操作

按服务器显示常见操作按钮：

1. 磁盘空间
2. 端口占用
3. 进程查询
4. 用户管理
5. 配置 yum/dnf/apt/pip 源
6. 重启服务
7. 查看日志
8. BMC 电源控制
9. 挂载镜像
10. 查看传感器 / 告警

#### 右栏：执行详情

显示：

1. 自然语言意图
2. 任务拆解
3. 选用命令原因
4. 风险提示
5. 回滚建议
6. 实时日志
7. 最终摘要

### 第一版最值得做的看板能力

1. 资产切换
2. 常见操作快捷按钮
3. 自然语言输入框
4. 计划预览
5. 高风险确认
6. 执行日志

不要一开始就做：

1. 拖拽编排
2. 复杂多租户权限
3. 大而全 CMDB
4. 全量监控平台替代

## 5. 本地 OpenCode + SSH + iBMC 是否可行

结论：**可行，而且是我建议你优先采用的路线。**

### 为什么可行

当前本地环境已经确认：

1. `opencode` 已安装
2. `opencode mcp` 可添加 MCP server
3. `opencode plugin` 可安装插件
4. 新装的 project skills 已经标记支持 `OpenCode`

这意味着你完全可以把 OpenCode 作为本地编排入口。

### 推荐架构

#### 本地控制面

1. OpenCode 负责对话、任务编排、技能调用
2. Web 看板负责展示资产、快捷操作、执行日志
3. 本地后端负责统一封装 SSH 与 iBMC 工具

#### 远程操作面

1. SSH 管理远程 Linux 主机
2. Redfish / 厂商 API 管理 iBMC
3. 必要时补 IPMI 兼容命令作为兜底

### 最稳的工具分层

#### A. SSH 层

建议由你自己的后端统一封装，而不是让模型直接拼 SSH 字符串。

后端提供固定工具：

1. `listHosts`
2. `runSshCommand(hostId, command, dryRun)`
3. `uploadFile(hostId, localPath, remotePath)`
4. `readRemoteFile(hostId, path)`

#### B. iBMC 层

建议优先走 Redfish，而不是先走 SSH。

后端提供固定工具：

1. `getBmcPowerState(hostId)`
2. `setBmcPowerState(hostId, action)`
3. `getBmcSensors(hostId)`
4. `getBmcEventLogs(hostId)`
5. `mountVirtualMedia(hostId, isoUrl)`
6. `getBmcConsoleUrl(hostId)`

### 为什么不要让模型直接连 iBMC

因为 iBMC 操作风险高：

1. 关机/重启是高风险动作
2. 挂载镜像会影响装机流程
3. 改账号和网络可能直接失联

所以更合理的做法是：

1. 模型只做意图解析和参数补全
2. 真正执行由你后端的白名单工具完成
3. 高风险动作统一二次确认

## 6. 我建议你的下一步实现顺序

### 第一阶段

1. 做资产清单
2. 做 SSH 工具层
3. 做 Linux 常见操作按钮
4. 做任务透明执行

### 第二阶段

1. 接 Redfish / iBMC 工具层
2. 做电源控制、传感器、事件日志
3. 做虚拟介质挂载

### 第三阶段

1. 把 OpenCode 作为本地 Agent 编排入口
2. 用 MCP 接入你自己的 SSH / Redfish 工具服务
3. 让 Web 看板与 OpenCode 共用同一套后端工具

## 7. 最终判断

### 建议保留的安装结果

保留当前已安装的 5 个 skills，它们对 Linux 安全、发行版排障和远程接入是有价值的。

### 需要你自己补的核心能力

1. `iBMC/Redfish` 专项工具层
2. `资产管理看板`
3. `SSH + Redfish` 统一任务编排层

### 结论

最现实、最强比赛说服力的方案不是“纯聊天 Agent”，而是：

1. 本地 OpenCode 做智能入口
2. Web 看板做资产与执行可视化
3. SSH 做 OS 运维
4. Redfish/iBMC 做硬件与带外管理
5. 所有动作走白名单工具，避免黑盒命令直出