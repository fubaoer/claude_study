# Vue 3 + Nest Monorepo

This repository uses npm workspaces to manage two projects:

- `fronted`: Vue 3 + Vite frontend
- `backed`: NestJS backend

## Setup

Install dependencies from the repository root:

```bash
npm install
```

## Run

Install dependencies and then run both projects:

```bash
npm install
npm run dev:back
npm run dev:front
```

Alternatively, open two terminals and run:

```bash
npm run dev:back
npm run dev:front
```

The frontend is available at `http://localhost:4173`.

Routes and APIs:

- Frontend pages:
  - `/` - 首页
  - `/users` - 用户列表页面
- Backend API:
  - `GET /api/hello`
  - `GET /api/users`

The frontend is available at `http://localhost:4173`, and `/api/*` is forwarded to the backend at `http://localhost:3000`.
