# Deployment Guide — Dependency Blast Radius Simulator

> **Note**: This guide covers local production builds and general deployment prerequisites. Cloud-specific setup (AWS, etc.) is not covered here.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |

---

## Environment Setup

### Backend

Copy and configure the backend environment file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# SQLite (default — zero dependencies needed):
DATABASE_URL="file:./dev.db"

# Port the backend listens on:
PORT=4000

# URL of the frontend (for CORS):
FRONTEND_URL=http://localhost:3000
# Production: FRONTEND_URL=https://your-domain.com
```

#### Switching to PostgreSQL (Production)

1. Edit `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/blast_radius"
   ```
3. Run migrations: `npm run prisma:migrate`

### Frontend

Copy and configure the frontend environment file:

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:

```env
# URL of the backend API (no trailing slash):
NEXT_PUBLIC_API_URL=http://localhost:4000
# Production: NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## Database Setup

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Apply migrations (creates dev.db for SQLite)
npm run prisma:migrate

# Seed with 24 services + 29 dependencies
npm run seed
```

---

## Production Build

### Backend

```bash
cd backend
npm install --production=false
npm run build           # Compiles TypeScript → dist/
```

Start production server:

```bash
npm run start           # node dist/server.js
```

### Frontend

```bash
cd frontend
npm install
npm run build           # Produces .next/ production bundle
npm start               # next start (serves on port 3000)
```

---

## Running Both Services

### Development (with hot-reload)

Terminal 1 — Backend:
```bash
cd backend && npm run dev
```

Terminal 2 — Frontend:
```bash
cd frontend && npm run dev
```

Open: http://localhost:3000

### Production (built)

Terminal 1 — Backend:
```bash
cd backend && npm start
```

Terminal 2 — Frontend:
```bash
cd frontend && npm start
```

---

## Process Management (Recommended for Servers)

Use **PM2** to keep both processes alive and auto-restart on crash:

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start backend/dist/server.js --name blast-radius-api

# Start frontend
pm2 start "npm start" --name blast-radius-frontend --cwd frontend

# Save process list (auto-restart on reboot)
pm2 save
pm2 startup
```

---

## Port Summary

| Service | Default Port | Env Variable |
|---|---|---|
| Backend (Express + Socket.IO) | 4000 | `PORT` |
| Frontend (Next.js) | 3000 | Next.js default |

---

## Verification Checklist

- [ ] `GET http://localhost:4000/health` returns `{"status":"ok"}`
- [ ] `GET http://localhost:4000/api/dashboard` returns service stats
- [ ] `http://localhost:3000/dashboard` loads with data
- [ ] Simulation page runs a simulation and streams live results
- [ ] History page shows completed simulations
- [ ] Graph page renders the topology

---

## Troubleshooting

| Issue | Fix |
|---|---|
| CORS error in browser | Check `FRONTEND_URL` in `backend/.env` matches the frontend origin exactly |
| Socket.IO not connecting | Ensure `NEXT_PUBLIC_API_URL` points to the backend; check browser console |
| Prisma client not generated | Run `cd backend && npm run prisma:generate` |
| Empty database | Run `cd backend && npm run seed` |
| Port already in use | Change `PORT` in `backend/.env` and `NEXT_PUBLIC_API_URL` in `frontend/.env.local` |
