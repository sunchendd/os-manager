FROM node:22-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    make \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared ./shared

# 安装依赖
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# 复制源代码
COPY backend ./backend
COPY frontend ./frontend

# 构建
RUN cd frontend && npm run build
RUN cd backend && npx tsc

# 创建数据目录
RUN mkdir -p /app/backend/data

# 暴露端口
EXPOSE 3002

WORKDIR /app/backend

CMD ["node", "dist/server.js"]
