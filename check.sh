#!/bin/bash
# OS Manager 部署验证脚本

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "OS Manager 部署验证"
echo "===================="

# 检查 Node.js
echo -n "Node.js 版本: "
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_MAJOR" -ge 22 ]; then
    echo -e "${GREEN}$NODE_VERSION ✓${NC}"
  else
    echo -e "${RED}$NODE_VERSION (需要 >= 22) ✗${NC}"
  fi
else
  echo -e "${RED}未安装 ✗${NC}"
fi

# 检查 npm
echo -n "npm 版本: "
if command -v npm &> /dev/null; then
  echo -e "${GREEN}$(npm -v) ✓${NC}"
else
  echo -e "${RED}未安装 ✗${NC}"
fi

# 检查服务状态
echo -n "OS Manager 服务: "
if systemctl is-active --quiet os-manager 2>/dev/null; then
  echo -e "${GREEN}运行中 ✓${NC}"
elif pgrep -f "dist/server.js" > /dev/null; then
  echo -e "${GREEN}运行中（非 systemd） ✓${NC}"
else
  echo -e "${RED}未运行 ✗${NC}"
fi

# 检查 OpenCode（核心依赖）
echo -n "OpenCode CLI: "
if command -v opencode &> /dev/null; then
  echo -e "${GREEN}已安装 ✓${NC}"
else
  echo -e "${RED}未安装 ✗${NC}"
  echo -e "   ${YELLOW}请运行: npm install -g @opencode/cli${NC}"
fi

# 检查端口
echo -n "端口 3002: "
if ss -tlnp | grep -q ":3002"; then
  echo -e "${GREEN}已监听 ✓${NC}"
else
  echo -e "${RED}未监听 ✗${NC}"
fi

# 健康检查
echo -n "HTTP 健康检查: "
if curl -s --max-time 3 http://localhost:3002/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}正常 ✓${NC}"
else
  echo -e "${RED}失败 ✗${NC}"
fi

echo ""
echo "===================="
echo "验证完成。如有 ✗ 项，请参考 README 进行修复。"
