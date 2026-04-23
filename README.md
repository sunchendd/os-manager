<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/DeepSeek-AI-FF6B6B?style=flat-square" />
  <img src="https://img.shields.io/badge/Socket.io-realtime-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square" />
</p>

<h1 align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" width="40" />
  OS Manager
</h1>

<p align="center">
  <b>Talk to your server. Like a human.</b>
</p>

<p align="center">
  <i>"Say goodbye to memorizing complex Linux commands. Just chat."</i>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

## ✨ What is OS Manager?

**OS Manager** is an AI-powered Linux server management tool with a natural language interface. No more googling `tar` flags or `systemctl` syntax — just type what you want in plain English (or Chinese), and the AI handles the rest.

> 🔥 **Killer feature**: It doesn't just execute commands. It **thinks**, **assesses risk**, and **explains** what it's doing — like having a senior DevOps engineer sitting next to you 24/7.

---

## 🌟 Feature Highlights

<table>
<tr>
<td width="50%">

### 🤖 Natural Language OS Management

"Check disk usage", "optimize nginx", "create user john" — all via chat. The AI translates your intent into safe, validated shell commands.

</td>
<td width="50%">

### 🎨 "Dark Terminal Luxe" UI

Not another generic AI purple gradient. Industrial-terminal aesthetic with **Bricolage Grotesque** + **JetBrains Mono** fonts, coral + gold accents, glass cards, and ambient glows.

</td>
</tr>
<tr>
<td width="50%">

### 💬 Multi-Session Chat

Context-isolated conversation windows. Switch between "Docker setup", "Security audit", and "Nginx tuning" without cross-contamination. Each session has its own memory.

</td>
<td width="50%">

### 🔧 Intelligent Skill System

Install skills from GitHub:
```bash
npx skills add owner/repo --skill name
```
Auto-keyword matching means the AI knows when to use `frontend-design`, `brainstorming`, or `git-advanced-workflows`.

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ Risk Assessment & Command Safety

Dangerous commands (`rm -rf`, user deletion) trigger **risk confirmation** with danger/warning/safe badges. The AI won't nuke your server by accident.

</td>
<td width="50%">

### 📊 Real-time System Dashboard

Disk, memory, CPU, processes, network — all visualized with glass cards and live **Socket.io** updates. Watch your server breathe in real-time.

</td>
</tr>
<tr>
<td width="50%">

### ⚡ One-Click System Optimization

10 optimization items with status detection (applied/needed). Auto-detects `apt`/`yum`/`dnf` for multi-distro support. Click → optimize → done.

</td>
<td width="50%">

### 🎙️ Voice Input + TTS

Speech-to-text for commands, text-to-speech for AI replies. Fully accessible. Talk to your server like it's Siri for sysadmins.

</td>
</tr>
<tr>
<td width="50%">

### 🔧 Service Management

Start/stop/restart systemd services directly from the UI. No more `systemctl` memorization. See status at a glance with beautiful running/stopped indicators.

</td>
<td width="50%">

### 🌐 Mirror Source Switching

One-click switch between Aliyun, Tencent, Tsinghua mirrors with auto-detection. Because `apt update` shouldn't take forever.

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- A Linux server (Ubuntu / CentOS / Debian / Fedora)
- DeepSeek API key (or compatible OpenAI-style endpoint)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/os-manager.git
cd os-manager

# Install dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start the backend
cd backend
npx tsx watch src/server.ts

# In another terminal, start the frontend
cd frontend
npm run dev
```

Open `http://localhost:3002` and start chatting with your server! 🎉

---

## 📸 Screenshots

### 🤖 Chat Interface

<p align="center">
  <img src="screenshots/chat-interface.png" width="90%" alt="Chat Interface" />
</p>

> Natural language server management. Just type what you want.

### 📊 System Dashboard

<p align="center">
  <img src="screenshots/system-dashboard.png" width="90%" alt="System Dashboard" />
</p>

> Real-time monitoring with glass cards. CPU, memory, disk, processes — all live.

### ⚡ Optimization Panel

<p align="center">
  <img src="screenshots/optimization-panel.png" width="90%" alt="Optimization Panel" />
</p>

> One-click optimization with health score. Know exactly what's secure and what needs work.

### 🔧 Skill Marketplace

<p align="center">
  <img src="screenshots/skill-marketplace.png" width="90%" alt="Skill Marketplace" />
</p>

> Install skills from GitHub. Extend your AI agent's capabilities infinitely.

### 🔧 Services Panel

<p align="center">
  <img src="screenshots/services-panel.png" width="90%" alt="Services Panel" />
</p>

> Manage systemd services with zero memorization. Click to start, stop, restart.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express + TypeScript |
| **AI Engine** | DeepSeek API (OpenAI-compatible) |
| **Real-time** | Socket.io |
| **Terminal** | XTerm.js |
| **Voice** | Web Speech API + TTS |
| **Fonts** | Bricolage Grotesque, JetBrains Mono |

---

## 🎯 Who is OS Manager For?

- 🧑‍💻 **Solo developers** who manage their own VPS but hate memorizing Linux commands
- 🏢 **Small teams** without a dedicated DevOps engineer
- 🎓 **Students** learning Linux who want a safety net
- 🏠 **Homelab enthusiasts** who want a beautiful dashboard for their servers
- 👔 **CTOs** who want their team to manage servers without breaking things

---

## 💡 Why OS Manager?

| | Traditional SSH | OS Manager |
|---|---|---|
| **Learning curve** | Steep | Zero |
| **Safety** | `rm -rf /` happens | Risk assessment + confirmation |
| **Monitoring** | `htop` + `df` + `free` | Beautiful unified dashboard |
| **Optimization** | Manual, error-prone | One-click, reversible |
| **Documentation** | Google everything | AI explains every step |

---

## 📝 License

MIT License — use it, fork it, ship it. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Beating%20Heart.png" width="20" /> and a lot of ☕
</p>

<p align="center">
  <i>Star ⭐ this repo if it saved you from a `sudo rm -rf` disaster!</i>
</p>
