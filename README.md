## Internal Site Monorepo

后端（Node.js + Express + Prisma）与前端（Vue/Vite）位于同一仓库，以下是快速启动指南。

### 目录结构

- `backend/`：API 服务（Express），使用 Prisma 连接 Postgres。
- `frontend/`：前端 Web 应用（Vite）。
- `docker-compose.yml`：在服务器上部署数据库/后端/前端的组合。

### 本地开发

1. **复制环境变量**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
   根据注释补齐配置，尤其是数据库连接。

2. **安装依赖**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **数据库**
   - 若本机有 Postgres，确保凭据与 `.env` 一致；
   - 或者使用 `docker compose up db` 启动容器，并执行 `npx prisma migrate dev`。

4. **启动服务**
   ```bash
   # 启动后端（默认 http://localhost:3100）
   cd backend
   npm run dev

   # 启动前端（默认 http://localhost:5173）
   cd ../frontend
   npm run dev
   ```

### 生产部署简要

1. 修改 `.env` 中的数据库/密钥配置。
2. 在服务器上执行 `docker compose up -d --build`。
3. 前端通过 `./frontend/Dockerfile` 构建后由 Nginx 提供静态资源，后端通过 `./backend/Dockerfile` 提供 API。

### 其他说明

- 后端入口 `backend/index.js` 已加入安全头（helmet）、全局错误处理、统一日志工具。
- Prisma Schema 在 `backend/prisma/schema.prisma`，任何修改后需要执行 `npx prisma migrate dev`。
- 前端 API Base URL 通过 `frontend/.env.local`（本地）和 `.env.production`（生产）控制。
