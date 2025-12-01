# 项目部署与维护指南 (Deployment Guide)

本文档总结了项目从本地开发到服务器部署的标准流程，以及常见问题的处理方法。

---

## ⚠️ 核心原则 (Core Principles)

1.  **数据库修改必须生成迁移文件**：
    *   只要修改了 `schema.prisma`，**必须**在本地运行 `npx prisma migrate dev` 生成迁移文件。
    *   **禁止**在服务器上直接修改数据库结构（不要在服务器运行 `migrate dev`）。
2.  **本地与服务器保持同步**：
    *   本地环境负责“产生”变更（代码 + 数据库结构）。
    *   服务器环境负责“拉取”并“应用”变更。

---

## 🚀 标准发布流程 (Standard Deployment Workflow)

### 第一阶段：本地开发 (Local)

当你完成了代码修改，特别是修改了 `schema.prisma` 后：

1.  **生成迁移文件** (仅当修改了数据库结构时需要)：
    ```powershell
    cd backend
    npx prisma migrate dev --name <描述本次修改，例如: add_user_field>
    ```
    *如果提示需要 reset 数据库，确认本地数据已备份后选择 yes。*

2.  **提交代码**：
    ```powershell
    git add .
    git commit -m "更新描述"
    git push
    ```

### 第二阶段：服务器部署 (Server)

登录服务器，执行以下命令：

1.  **拉取最新代码**：
    ```bash
    git pull
    ```

2.  **更新并重启服务**：
    ```bash
    docker-compose up -d --build
    ```
    *此命令会自动执行数据库迁移（如果一切正常）。*

---

## 🔧 常见错误与处理 (Troubleshooting)

### 1. 部署后后端报错 "Table already exists" (表已存在)
*   **现象**：`docker logs internal_backend` 显示某个表已经存在，导致迁移失败，容器不断重启。
*   **原因**：服务器数据库里已经有了这个表（可能之前手动 push 过），但迁移记录里没有标记。
*   **解决方法**：
    ```bash
    # 1. 停止后端
    docker-compose stop backend
    
    # 2. 标记该迁移为“已应用” (将 <MIGRATION_NAME> 替换为报错的那个迁移文件夹名)
    docker-compose run --rm backend npx prisma migrate resolve --applied <MIGRATION_NAME>
    
    # 3. 重启后端
    docker-compose up -d backend
    ```

### 2. 部署后登录报错 500 (Server Error)
*   **现象**：前端点击登录报 500，后端日志显示 `Column not found` 或类似字段缺失错误。
*   **原因**：数据库迁移被跳过或未完全执行，导致数据库缺少了代码中需要的新字段。
*   **解决方法**：
    ```bash
    # 强制同步数据库结构（自动补全缺失字段）
    docker exec -it internal_backend npx prisma db push
    ```

### 3. 登录页面卡住 / 502 Bad Gateway
*   **现象**：点击登录没反应，或者显示 502。
*   **原因**：后端容器挂了（通常是因为数据库连接失败或迁移失败）。
*   **解决方法**：
    1.  检查日志：`docker logs internal_backend`
    2.  如果是数据库问题，参考上述第 1 点处理。

---

## 📚 常用命令速查

| 操作 | 命令 (服务器端) |
| :--- | :--- |
| **查看后端日志** | `docker logs -f internal_backend` |
| **重启后端** | `docker-compose restart backend` |
| **完全重置并更新** | `docker-compose down && docker-compose up -d --build` |
| **进入后端容器终端** | `docker exec -it internal_backend sh` |
