# ./frontend/Dockerfile

# --- 阶段 1: 构建 (Build Stage) ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# (关键) 运行构建命令
RUN npm run build

# --- 阶段 2: 服务 (Serve Stage) ---
FROM nginx:alpine
# 复制构建好的 dist 文件夹到 Nginx 的网页根目录
COPY --from=builder /app/dist /usr/share/nginx/html
# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 暴露 Nginx 的默认端口
EXPOSE 80