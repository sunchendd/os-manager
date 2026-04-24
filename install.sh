#!/bin/bash
set -e

# OS Manager 一键部署脚本
# 支持: Ubuntu / Debian / CentOS / RHEL / Fedora / openEuler / Anolis / Kylin

OS_MANAGER_DIR="/opt/os-manager"
SERVICE_NAME="os-manager"
NODE_MIN_VERSION="22"

colors() {
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  NC='\033[0m'
}

detect_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID=$ID
    DISTRO_NAME=$NAME
    DISTRO_VERSION=$VERSION_ID
  else
    echo -e "${RED}无法检测 Linux 发行版${NC}"
    exit 1
  fi
}

check_root() {
  if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 权限运行此脚本: sudo bash install.sh${NC}"
    exit 1
  fi
}

print_banner() {
  echo -e "${CYAN}"
  cat << 'EOF'
   ____   _____ __  __  __  _______  _____ ____  
  / __ \ / ___// / / / | |/ / ___/ |/ / _ \__  \ 
 / / / / \__ \/ /_/ /  |   / /  /    /  __/__/ / 
/_/ /_/ /____/\____/  /___/_/  /_/|_/\___/____/  
                                                  
EOF
  echo -e "${NC}"
  echo -e "${BLUE}OS Manager - AI 驱动的 Linux 服务器管理平台${NC}"
  echo -e "${BLUE}===========================================${NC}\n"
}

install_nodejs() {
  echo -e "${YELLOW}[1/7] 检查 Node.js 环境...${NC}"
  
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge "$NODE_MIN_VERSION" ]; then
      echo -e "${GREEN}Node.js $(node -v) 已安装，跳过此步骤${NC}"
      return
    else
      echo -e "${YELLOW}Node.js 版本过低 ($(node -v))，需要 >= ${NODE_MIN_VERSION}${NC}"
    fi
  fi

  echo -e "${YELLOW}正在安装 Node.js ${NODE_MIN_VERSION}...${NC}"

  case "$DISTRO_ID" in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq curl ca-certificates gnupg
      curl -fsSL https://deb.nodesource.com/setup_${NODE_MIN_VERSION}.x | bash -
      apt-get install -y -qq nodejs
      ;;
    centos|rhel|fedora|openeuler|almalinux|rocky)
      if command -v dnf &> /dev/null; then
        dnf install -y -q curl
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_MIN_VERSION}.x | bash -
        dnf install -y -q nodejs
      else
        yum install -y -q curl
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_MIN_VERSION}.x | bash -
        yum install -y -q nodejs
      fi
      ;;
    *)
      echo -e "${RED}不支持的发行版: $DISTRO_NAME${NC}"
      echo -e "${YELLOW}请手动安装 Node.js ${NODE_MIN_VERSION}+ 后重新运行${NC}"
      exit 1
      ;;
  esac

  echo -e "${GREEN}Node.js $(node -v) 安装完成${NC}"
}

install_system_deps() {
  echo -e "${YELLOW}[2/7] 安装系统依赖...${NC}"
  
  case "$DISTRO_ID" in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq git curl wget build-essential python3 systemd
      ;;
    centos|rhel|fedora|openeuler|almalinux|rocky)
      if command -v dnf &> /dev/null; then
        dnf install -y -q git curl wget gcc-c++ make python3 systemd
      else
        yum install -y -q git curl wget gcc-c++ make python3 systemd
      fi
      ;;
  esac
  
  echo -e "${GREEN}系统依赖安装完成${NC}"
}

install_opencode() {
  echo -e "${YELLOW}[3/7] 安装 OpenCode CLI（核心依赖）...${NC}"
  
  if command -v opencode &> /dev/null; then
    echo -e "${GREEN}OpenCode CLI 已安装: $(opencode --version 2>/dev/null || echo 'unknown')${NC}"
    return
  fi

  echo -e "${YELLOW}正在安装 OpenCode CLI...${NC}"
  
  if command -v npm &> /dev/null; then
    npm install -g @opencode/cli 2>/dev/null || {
      echo -e "${YELLOW}npm 安装失败，尝试 curl 安装...${NC}"
      curl -fsSL https://get.opencode.ai | bash
    }
  else
    echo -e "${RED}npm 未安装，无法自动安装 OpenCode CLI${NC}"
    echo -e "${YELLOW}请手动安装: npm install -g @opencode/cli${NC}"
  fi

  if command -v opencode &> /dev/null; then
    echo -e "${GREEN}OpenCode CLI 安装完成${NC}"
  else
    echo -e "${RED}✗ OpenCode CLI 安装失败！${NC}"
    echo -e "${YELLOW}   请手动安装: npm install -g @opencode/cli${NC}"
    echo -e "${YELLOW}   或访问: https://opencode.ai${NC}"
  fi
}

deploy_os_manager() {
  echo -e "${YELLOW}[4/7] 部署 OS Manager...${NC}"

  if [ -f "package.json" ] && [ -d "backend" ] && [ -d "frontend" ]; then
    OS_MANAGER_DIR="$(pwd)"
    echo -e "${GREEN}检测到当前目录为项目目录${NC}"
  elif [ -d "$OS_MANAGER_DIR" ]; then
    echo -e "${YELLOW}检测到已存在的安装目录，更新代码...${NC}"
    cd "$OS_MANAGER_DIR"
    git pull 2>/dev/null || true
  else
    echo -e "${YELLOW}从 GitHub 克隆项目...${NC}"
    git clone https://github.com/yourusername/os-manager.git "$OS_MANAGER_DIR" 2>/dev/null || {
      echo -e "${RED}GitHub 克隆失败，请手动上传项目代码到 $OS_MANAGER_DIR${NC}"
      exit 1
    }
  fi

  cd "$OS_MANAGER_DIR"
  
  echo -e "${YELLOW}安装项目依赖 (这可能需要几分钟)...${NC}"
  npm install --production 2>/dev/null || npm install
  
  echo -e "${YELLOW}构建前端...${NC}"
  cd "$OS_MANAGER_DIR/frontend"
  npm install 2>/dev/null || true
  npm run build
  
  echo -e "${YELLOW}构建后端...${NC}"
  cd "$OS_MANAGER_DIR/backend"
  npm install 2>/dev/null || true
  npx tsc

  echo -e "${GREEN}OS Manager 构建完成${NC}"
}

setup_env() {
  echo -e "${YELLOW}[5/7] 配置环境变量...${NC}"
  
  cd "$OS_MANAGER_DIR"
  
  if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
      cp .env.example .env
      echo -e "${GREEN}已创建 .env 配置文件${NC}"
    else
      cat > .env << 'EOF'
# ============================================
# OS Manager 环境配置
# ============================================

# OpenCode 配置
# 1. 安装 opencode CLI: npm install -g @opencode/cli
# 2. 配置 opencode: opencode config set api_key=your_key
# 3. 获取 Key: https://opencode.ai
# 4. 确保 opencode 在 PATH 中，然后 systemctl restart os-manager

# 服务器配置
PORT=3002
FRONTEND_URL=http://localhost:5173

# 执行配置
EXECUTION_TIMEOUT=30000
MAX_OUTPUT_SIZE=1048576
EOF
      echo -e "${GREEN}已创建默认 .env 配置文件${NC}"
    fi
  else
    echo -e "${GREEN}.env 已存在，跳过创建${NC}"
  fi
}

setup_systemd() {
  echo -e "${YELLOW}[6/7] 配置系统服务...${NC}"

  cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=OS Manager - AI Linux Server Management Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${OS_MANAGER_DIR}/backend
ExecStart=/usr/bin/node ${OS_MANAGER_DIR}/backend/dist/server.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/os-manager.log
StandardError=append:/var/log/os-manager.log
Environment=NODE_ENV=production
Environment="PATH=/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin"

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}.service
  
  echo -e "${GREEN}systemd 服务配置完成${NC}"
}

print_final_message() {
  IP_ADDR=$(hostname -I | awk '{print $1}')
  HAS_OPENCODE=$(command -v opencode &> /dev/null && echo "yes" || echo "no")
  
  echo -e "\n${GREEN}===========================================${NC}"
  echo -e "${GREEN}  OS Manager 部署成功！${NC}"
  echo -e "${GREEN}===========================================${NC}\n"
  
  echo -e "${CYAN}📍 访问地址:${NC}"
  echo -e "   本地: ${YELLOW}http://localhost:3002${NC}"
  echo -e "   局域网: ${YELLOW}http://${IP_ADDR}:3002${NC}\n"
  
  if [ "$HAS_OPENCODE" = "yes" ]; then
    echo -e "${GREEN}✅ OpenCode CLI 已安装${NC}"
    echo -e "${CYAN}🔧 下一步 - 配置 OpenCode API Key:${NC}"
    echo -e "   1. 获取 API Key: ${YELLOW}https://opencode.ai${NC}"
    echo -e "   2. 配置: ${YELLOW}opencode config set api_key=your_key${NC}"
    echo -e "   3. 重启服务: ${YELLOW}systemctl restart os-manager${NC}\n"
  else
    echo -e "${RED}⚠️  OpenCode CLI 未安装！${NC}"
    echo -e "${CYAN}🔧 请立即安装:${NC}"
    echo -e "   ${YELLOW}npm install -g @opencode/cli${NC}"
    echo -e "   然后配置 API Key 并重启服务\n"
  fi
  

  
  echo -e "${CYAN}🔧 服务管理命令:${NC}"
  echo -e "   启动: ${YELLOW}systemctl start os-manager${NC}"
  echo -e "   停止: ${YELLOW}systemctl stop os-manager${NC}"
  echo -e "   重启: ${YELLOW}systemctl restart os-manager${NC}"
  echo -e "   状态: ${YELLOW}systemctl status os-manager${NC}"
  echo -e "   日志: ${YELLOW}tail -f /var/log/os-manager.log${NC}\n"
  
  echo -e "${CYAN}📖 快速开始:${NC}"
  if [ "$HAS_OPENCODE" = "yes" ]; then
    echo -e "   1. 配置 OpenCode API Key"
  else
    echo -e "   1. 安装并配置 OpenCode CLI"
  fi
  echo -e "   2. 重启服务: systemctl restart os-manager"
  echo -e "   3. 浏览器访问 http://${IP_ADDR}:3002"
  echo -e "   4. 开始与 AI 对话管理服务器！${NC}\n"
}

# ============ 主流程 ============
colors
check_root
print_banner
detect_distro

echo -e "${BLUE}检测到系统: $DISTRO_NAME $DISTRO_VERSION${NC}\n"

install_system_deps
install_nodejs
install_opencode
deploy_os_manager
setup_env
setup_systemd

# 启动服务
systemctl start ${SERVICE_NAME}.service 2>/dev/null || true
sleep 2

print_final_message
