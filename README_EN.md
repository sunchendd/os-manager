<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenCode-Agent-FF6B6B?style=flat-square" />
  <img src="https://img.shields.io/badge/Socket.io-realtime-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square" />
</p>

<h1 align="center">🚀 OS Manager</h1>

<p align="center">
  <b>Your next sysadmin won't be human.</b>
</p>

<p align="center">
  <i>An open-source AI-powered Linux server management platform. Talk to your server like a human — it thinks, assesses risks, and executes.</i>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## What is OS Manager?

OS Manager turns AI into your 24/7 Linux sysadmin. No more memorizing `tar` flags or `systemctl` syntax — just chat in natural language, and the AI handles the rest.

Unlike traditional server dashboards, OS Manager doesn't just display metrics. It **thinks**, **assesses risks**, **explains actions**, and **autonomously executes** — like having a senior DevOps engineer who never sleeps.

<p align="center">
  <img src="screenshots/chat-interface.png" width="90%" alt="OS Manager Chat Interface" />
</p>

---

## Features

- **🤖 Natural Language OS Management** — "Check disk usage", "optimize nginx", "create user john" — the AI translates intent into safe, validated shell commands.
- **🎨 Dark Terminal Luxe UI** — Industrial-terminal aesthetic with glass cards, ambient glows, and coral + gold accents. Not another generic AI purple gradient.
- **💬 Persistent Multi-Session Chat** — Context-isolated conversations that survive server restarts. Switch between "Docker setup", "Security audit", and "Nginx tuning" without cross-contamination.
- **🎭 Custom AI Agents** — Create specialized agents with unique instructions, models, skills, and environment variables. Your "Linux Expert" and "Security Auditor" coexist.
- **🛡️ Risk Assessment & Safety** — Dangerous commands trigger real-time confirmation with danger/warning/safe badges. `rm -rf /` won't happen by accident.
- **📊 Real-Time System Dashboard** — Disk, memory, CPU, processes, network — all visualized with live Socket.io updates.
- **⏰ Scheduled AI Tasks** — Cron-based automation: "Check disk every morning at 9", "Run security audit weekly". The AI executes autonomously and saves results.
- **⚡ One-Click Optimization** — 10 optimization items with status detection. Auto-detects `apt`/`yum`/`dnf` across distros.
- **🔧 Intelligent Skill System** — Install skills from GitHub to extend AI capabilities. Auto-keyword matching means the AI knows when to summon `frontend-design` or `git-advanced-workflows`.
- **🔌 OpenCode Integration** — Seamlessly connects with OpenCode CLI for advanced agentic workflows: web browsing, data extraction, multi-step autonomous execution.
- **🎙️ Voice Input + TTS** — Speech-to-text for commands, text-to-speech for replies. Talk to your server like Siri for sysadmins.

---

## Supported Platforms

| OS Family | Distributions |
|-----------|--------------|
| **Debian/Ubuntu** | Ubuntu 20.04+, Debian 11+ |
| **RHEL/CentOS** | CentOS 7/8, RHEL 8/9, AlmaLinux, Rocky Linux |
| **Fedora** | Fedora 36+ |
| **openEuler** | openEuler 20.03+ |
| **Others** | Any Linux with systemd and Node.js 22+ |

**Architecture:** x86_64 / AMD64 (ARM64 support planned)

---

## Quick Start

### Prerequisites
- A Linux server (Ubuntu / CentOS / Debian / Fedora / openEuler)
- Root or sudo access
- OpenCode CLI (installs automatically with the script)

---

### Option 1: One-Click Script (Recommended)

The fastest way to deploy on any supported Linux distribution:

```bash
# Download and run the install script
curl -fsSL https://raw.githubusercontent.com/yourusername/os-manager/main/install.sh | sudo bash
```

The script will automatically:
- Detect your Linux distribution (Ubuntu, Debian, CentOS, RHEL, Fedora, openEuler, AlmaLinux, Rocky Linux)
- Install Node.js 22+ if not present
- Install system dependencies (git, curl, build tools)
- Install OpenCode CLI for advanced agent features
- Build the project
- Configure systemd service for auto-start

**After installation, configure OpenCode:**
```bash
opencode config set api_key=your_key_here
sudo systemctl restart os-manager
```

---

### Option 2: Docker Deployment

For isolated, portable deployment:

```bash
# Clone repository
git clone https://github.com/yourusername/os-manager.git
cd os-manager

# Configure environment
cp .env.example .env
# Edit .env if needed

# Start with Docker Compose
docker-compose up -d
```

---

### Option 3: Manual Installation

For development or custom setups:

```bash
# Clone
git clone https://github.com/yourusername/os-manager.git
cd os-manager

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed (OpenCode config is done via CLI)

# Build frontend
cd frontend && npm install && npm run build && cd ..

# Build backend
cd backend && npm install && npx tsc && cd ..

# Start production server
node backend/dist/server.js
```

---

### Post-Deployment Configuration

⚠️ **Configure OpenCode before using AI features:**

1. Get your OpenCode API key: [opencode.ai](https://opencode.ai)
2. Configure the CLI:
   ```bash
   opencode config set api_key=your_key_here
   ```
3. Restart the service:
   ```bash
   # For systemd installation
   sudo systemctl restart os-manager
   
   # For Docker
   docker-compose restart
   ```

4. Open `http://your-server-ip:3002` and start managing your server with AI! 🎉

### Verify Installation

Run the verification script to check your deployment:

```bash
# If installed via script
sudo /opt/os-manager/check.sh

# If manual/Docker
bash check.sh
```

This checks: Node.js version, service status, API key config, port binding, OpenCode CLI, and HTTP health.

---

## Screenshots

### 🤖 Chat Interface

<p align="center">
  <img src="screenshots/chat-interface.png" width="90%" alt="Chat Interface" />
</p>

> Natural language server management. Just type what you want.

### 🎭 AI Agent Management

<p align="center">
  <img src="screenshots/agent-panel-empty.png" width="90%" alt="AI Agents" />
</p>

> Create custom AI agents with unique personalities, skills, and models.

### 📊 System Dashboard

<p align="center">
  <img src="screenshots/system-dashboard.png" width="90%" alt="System Dashboard" />
</p>

> Real-time monitoring with glass cards. CPU, memory, disk, processes — all live.

### ⚡ Optimization Panel

<p align="center">
  <img src="screenshots/optimization-panel.png" width="90%" alt="Optimization Panel" />
</p>

> Health score at a glance. Know exactly what's secure and what needs work.

### ⏰ Scheduled Tasks

<p align="center">
  <img src="screenshots/scheduled-tasks.png" width="90%" alt="Scheduled Tasks" />
</p>

> Set up cron-based AI tasks. The agent runs automatically and saves results.

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

## OS Manager vs Traditional Tools

| | SSH Terminal | Traditional Dashboard | OS Manager |
|---|---|---|---|
| **Learning curve** | Steep | Moderate | Zero |
| **Safety** | `rm -rf /` happens | Passive monitoring | Risk assessment + confirmation |
| **Execution** | Manual typing | Read-only | AI-autonomous |
| **Monitoring** | `htop` + `df` + `free` | Charts only | Unified dashboard + AI insights |
| **Optimization** | Manual, error-prone | None | One-click, reversible |
| **Automation** | crontab editing | Alert-only | Visual scheduled AI tasks |
| **Documentation** | Google everything | Wiki | AI explains every step |

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   React 19   │────>│  Express     │────>│   JSON Files     │
│   Frontend   │<────│  + Socket.io │<────│   (sessions,     │
└──────────────┘     └──────┬───────┘     │    agents, tasks)│
                            │             └──────────────────┘
                     ┌──────┴───────┐
                      │  OpenCode    │
                     │  AI Engine   │
                     └──────────────┘
```

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express + TypeScript + Socket.io |
| **AI Engine** | OpenCode CLI |
| **Scheduling** | node-cron |
| **Persistence** | JSON file storage (zero-config) |
| **Voice** | Web Speech API + TTS |
| **Fonts** | Bricolage Grotesque, JetBrains Mono |

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/agents` | GET/POST | List / create AI agents |
| `/api/agents/:id` | PUT/DELETE | Update / delete agent |
| `/api/scheduled-tasks` | GET/POST | List / create scheduled tasks |
| `/api/scheduled-tasks/:id` | PUT/DELETE | Update / delete task |
| `/api/scheduled-tasks/:id/run` | POST | Execute task manually |
| `/api/dashboard` | GET | Aggregated system stats |
| `/api/skills` | GET | List installed skills |

See the source code for the full API reference.

---

## Who is OS Manager For?

- 🧑‍💻 **Solo developers** managing their own VPS without a DevOps background
- 🏢 **Small teams** without a dedicated ops engineer
- 🎓 **Students** learning Linux who want a safety net
- 🏠 **Homelab enthusiasts** who want a beautiful, intelligent server dashboard
- 👔 **CTOs** who want their team to manage servers safely

---

## License

MIT License — use it, fork it, ship it. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ and a lot of ☕
</p>

<p align="center">
  <i>Star ⭐ this repo if it saved you from a <code>sudo rm -rf</code> disaster!</i>
</p>
