# ./backend/Dockerfile

# 1. 使用一个轻量级的 Node 镜像
FROM node:20-alpine

# 2. 在容器内创建一个工作目录
WORKDIR /app

# 3. 复制 package.json 和 lock 文件
COPY package*.json ./

# 4. 安装依赖
RUN npm install --omit=dev

# 5. 复制所有后端代码
COPY . .

# 6. (关键) 运行 Prisma generate
RUN npx prisma generate

# 7. 暴露容器内部端口 (这和你 package.json 里的启动端口一致)
EXPOSE 3000

# 8. (关键) 启动服务, 并确保数据库迁移自动运行
# 这会先执行数据库迁移，然后再启动 Node.js 服务
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]