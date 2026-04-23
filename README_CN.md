<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/DeepSeek-AI-FF6B6B?style=flat-square" />
  <img src="https://img.shields.io/badge/Socket.io-实时推送-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/许可证-MIT-brightgreen?style=flat-square" />
</p>

<h1 align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" width="40" />
  OS Manager — 服务器管家
</h1>

<p align="center">
  <b>跟服务器说话，要像跟对象说话一样自然 💬</b>
</p>

<p align="center">
  <i>"忘掉那些折磨人的 Linux 命令吧，开口就行！"</i>
</p>

<p align="center">
  <a href="#-核心卖点">核心卖点</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-界面截图">界面截图</a> •
  <a href="#-技术栈">技术栈</a>
</p>

---

## 🤔 这是啥？

**OS Manager** 是一款基于 AI 的 Linux 服务器管理神器，主打「自然语言交互」。不用再背 `tar` 参数、不用死记 `systemctl` 语法——像聊天一样打字，AI 帮你搞定一切！

> 🔥 **王炸功能**：它不只是执行命令，它会**思考**、**评估风险**、**解释原理**——就像身边坐着一位 7×24 小时在线的资深运维大佬！

---

## 🌟 核心卖点

<table>
<tr>
<td width="50%">

### 🤖 自然语言操作系统管理

"看看磁盘还剩多少"、"优化一下 nginx"、"给我建个用户叫 john"——打字就行！AI 自动把你的大白话翻译成安全可靠的 Shell 命令。

</td>
<td width="50%">

### 🎨 独创「暗黑科技终端」UI

拒绝千篇一律的 AI 紫渐变！工业风终端美学，**Bricolage Grotesque** + **JetBrains Mono** 双字体加持，珊瑚红 + 鎏金配色，玻璃拟态卡片 + 环境光晕——帅就一个字！

</td>
</tr>
<tr>
<td width="50%">

### 💬 多会话隔离聊天

每个会话独立上下文，互不串台！"Docker 配置"、"安全巡检"、"Nginx 调优"随便切，AI 记忆不会乱成一锅粥。

</td>
<td width="50%">

### 🔧 智能技能系统

GitHub 一键装技能：
```bash
npx skills add owner/repo --skill name
```
自动关键词匹配，AI 秒懂什么时候该召唤 `frontend-design`、`brainstorming`、`git-advanced-workflows` 各种神技！

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ 风险评估 + 命令安全

遇到危险操作（`rm -rf`、删用户之类），自动弹出**风险确认**，红橙绿三色安全标签一眼看清。想手滑删库？门儿都没有！

</td>
<td width="50%">

### 📊 实时系统仪表盘

磁盘、内存、CPU、进程、网络——全部玻璃卡片可视化，**Socket.io** 实时推送。看着服务器呼吸，是一种享受～

</td>
</tr>
<tr>
<td width="50%">

### ⚡ 一键系统优化

10 大优化项，状态实时检测（已应用 / 待优化）。自动识别 `apt`/`yum`/`dnf`，多发行版通吃。点一下，等几秒，搞定！

</td>
<td width="50%">

### 🎙️ 语音输入 + 语音播报

说话就能下命令，AI 回复还能读出来。完全无障碍操作。这就是服务器版的 Siri！

</td>
</tr>
<tr>
<td width="50%">

### 🔧 系统服务管理

`systemctl` 是什么？不需要记！直接在 UI 里点一下启动 / 停止 / 重启。运行状态一目了然，美丽又直观。

</td>
<td width="50%">

### 🌐 软件源一键切换

阿里云、腾讯云、清华源——秒切！自动检测最佳源，`apt update` 再也不用等到天荒地老。

</td>
</tr>
</table>

---

## 🚀 快速开始

### 环境要求
- Node.js 22+
- 一台 Linux 服务器（Ubuntu / CentOS / Debian / Fedora 都行）
- DeepSeek API Key（或兼容 OpenAI 格式的端点）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/os-manager.git
cd os-manager

# 装依赖
npm install

# 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填入你的 API Key

# 启动后端
cd backend
npx tsx watch src/server.ts

# 另开终端，启动前端
cd frontend
npm run dev
```

浏览器打开 `http://localhost:3002`，开始跟服务器唠嗑吧！🎉

---

## 📸 界面截图

### 🤖 智能对话界面

<p align="center">
  <img src="screenshots/chat-interface.png" width="90%" alt="智能对话" />
</p>

> 像聊天一样管理服务器，简直不要太爽！

### 📊 系统监控仪表盘

<p align="center">
  <img src="screenshots/system-dashboard.png" width="90%" alt="系统监控" />
</p>

> 实时监控玻璃卡片，CPU 内存磁盘进程一网打尽！

### ⚡ 系统优化面板

<p align="center">
  <img src="screenshots/optimization-panel.png" width="90%" alt="系统优化" />
</p>

> 健康评分一目了然，哪里不安全点哪里！

### 🔧 技能市场

<p align="center">
  <img src="screenshots/skill-marketplace.png" width="90%" alt="技能市场" />
</p>

> GitHub 装技能，无限扩展 AI 超能力！

### 🔧 系统服务面板

<p align="center">
  <img src="screenshots/services-panel.png" width="90%" alt="系统服务" />
</p>

> systemd 服务可视化，点一下就能操控，告别死记硬背！

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + TypeScript + Tailwind CSS |
| **后端** | Node.js + Express + TypeScript |
| **AI 引擎** | DeepSeek API（兼容 OpenAI 格式） |
| **实时通信** | Socket.io |
| **终端** | XTerm.js |
| **语音** | Web Speech API + TTS |
| **字体** | Bricolage Grotesque、JetBrains Mono |

---

## 🎯 适合谁用？

- 🧑‍💻 **独立开发者** —— 自己管 VPS，但真的不想背 Linux 命令
- 🏢 **小团队** —— 没有专职运维，又想稳定不出事
- 🎓 **学生党** —— 学 Linux 的最佳安全网，随便玩不怕崩
- 🏠 ** homelab 玩家** —— 想要一个颜值爆表的服务器仪表盘
- 👔 **技术负责人** —— 让团队安全管服务器，不怕手滑误操作

---

## 💡 为什么选 OS Manager？

| | 传统 SSH 终端 | OS Manager |
|---|---|---|
| **学习成本** | 陡峭如山 😰 | 零门槛 😎 |
| **安全性** | `rm -rf /` 随时发生 💀 | 风险评估 + 二次确认 🛡️ |
| **监控** | `htop` + `df` + `free` 拼拼凑凑 | 统一高颜值仪表盘 ✨ |
| **优化** | 手动操作，容易翻车 | 一键优化，可回退 🔄 |
| **查文档** | 疯狂 Google | AI 每一步都解释 📖 |

---

## 📝 开源协议

MIT 许可证 —— 随意用、随便改、放心商用！详见 [LICENSE](LICENSE)。

---

<p align="center">
  用 <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Beating%20Heart.png" width="20" /> 和无数杯 ☕ 写成
</p>

<p align="center">
  <i>如果 OS Manager 帮你躲过了一次 `sudo rm -rf`，记得点个 ⭐ 再走！</i>
</p>
