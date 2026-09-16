# bad-actors-engine 单容器部署：Node 构建前端 + Python 运行后端（含 SPA 托管）
#
# 为什么需要这个镜像：
# - main.py 里有 SPA 托管逻辑（FRONTEND_DIR = <项目根>/bad-actors-frontend/dist），
#   但 dist 被 .gitignore 排除，Railway 拉到的仓库里没有前端产物，那段逻辑不生效，
#   导致 Railway 域名只能访问 API 与 /docs，打不开界面。
# - 该镜像在构建阶段用 Node 编译前端，再把产物放进约定目录，
#   于是 Railway 一次部署即可同时提供 API 与前端页面，且 push 源码后自动重建。
#
# 说明：本文件存在时 Railway 会自动改用 Docker 构建，Procfile 不再生效。

# ---------- 阶段 1：构建 React 前端 ----------
FROM node:22-alpine AS frontend
WORKDIR /fe
# 先只拷依赖清单：源码变动时这一层仍可命中缓存，避免每次重装依赖
COPY bad-actors-frontend/package.json bad-actors-frontend/package-lock.json ./
RUN npm ci
# 再拷源码执行 tsc -b && vite build，产物落在 /fe/dist
COPY bad-actors-frontend/ ./
RUN npm run build

# ---------- 阶段 2：Python 运行时 ----------
FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# 把前端构建产物放到 main.py 约定的目录，SPA 兜底路由才会注册
COPY --from=frontend /fe/dist ./bad-actors-frontend/dist
# Railway 通过 $PORT 注入端口，用 sh -c 以便展开变量（JSON exec 形式不会展开）
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]