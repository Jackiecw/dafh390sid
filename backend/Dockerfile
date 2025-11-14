# ./backend/Dockerfile

# 1. 使用一个轻量级的 Node 镜像
FROM node:20-alpine

# 2. 在容器内创建一个工作目录
WORKDIR /app

# 3. 复制 package.json 和 lock 文件
COPY package*.json ./

# 4. (关键修复) 运行安装，但跳过 postinstall 脚本
RUN npm install --omit=dev --ignore-scripts

# 5. 复制所有后端代码 (现在 prisma/schema.prisma 进来了)
COPY . .

# 6. (关键) 现在我们可以安全地手动运行 prisma generate
RUN npx prisma generate

# 7. 暴露容器内部端口
EXPOSE 3000

# 8. 启动服务, 并确保数据库迁移自动运行
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]