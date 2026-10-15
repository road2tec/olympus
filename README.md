# Olympus — Athlete Digital Twin & Coach Intelligence Platform

A MERN decision-support application. Athletes log daily training, performance and recovery. The **Olympus Engine** keeps an evolving Digital Twin (performance, training load, recovery, fatigue, adaptation) using exponential moving averages. It flags "Needs Attention" patterns with explainable rules, writes plain-language insights, and produces weekly progress reports (online and as PDF).

> Olympus is a decision-support application built on a simplified data-analytics model. It is not a medical device and does not replace a doctor, physiotherapist, or qualified coach.

## Features
- Athlete, Coach and Admin roles (JWT auth, bcrypt, role-based access, strict validation)
- Athlete profile, daily tracking form (under one minute), entry history
- Digital Twin with current vs previous state, trends, and Needs Attention detection
- Deterministic, explainable insights stored in MongoDB
- Weekly reports (Mon–Sun) with PDF export (PDFKit)
- Premium dark sports-analytics UI, responsive, Chart.js charts

## Prerequisites
- Node.js 20+ and npm 10+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

## How to run

**1. Clone and install**
```bash
git clone <repo-url> olympus && cd olympus
cd server && npm install
cd ../client && npm install
```

**2. Configure the server** (`server/.env` is git-ignored)
```bash
cd ../server
cp .env.example .env        # Windows PowerShell: copy .env.example .env
```
Edit `.env` and set `JWT_SECRET` to a random string of 32+ characters:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Set `MONGODB_URI` if you use Atlas or a non-default MongoDB.

**3. Seed demo data (development only)**
```bash
npm run seed
```

**4. Start the backend** (terminal 1)
```bash
cd server
npm start                   # API on http://localhost:5000  (health: /api/v1/health)
```
`npm run dev` also works but restarts on file changes (`node --watch`), which can cause brief 502 errors in the UI.

**5. Start the frontend** (terminal 2)
```bash
cd client
npm run dev                 # UI on http://localhost:5173 (Vite picks another port if busy)
```
Vite proxies `/api` to `http://localhost:5000`, so the client needs no configuration in development.

**6. Log in** (fictional demo accounts, development only)

| Role | Email | Password |
|---|---|---|
| Athlete (Arjun Rao) | athlete@olympus.demo | Athlete@123 |
| Coach (Meera Iyer) | coach@olympus.demo | Coach@12345 |
| Admin | admin@olympus.demo | Admin@12345 |

Never use these credentials in production.

## Run the tests
```bash
cd server && npm test        # needs MongoDB; uses database "olympus_test"
cd client && npm test
cd client && npm run build
```

## Test results (last run)
| Suite | Command | Result |
|---|---|---|
| Server (engine, API, auth, entries, reports) | `cd server && npm test` | ✅ **11 files, 129 tests passed** |
| Client (login/register and daily-entry validation) | `cd client && npm test` | ✅ **2 files, 6 tests passed** |
| Client production build | `cd client && npm run build` | ✅ **built successfully** |
| Live API flow (register → login → profile → entries → Needs Attention → report → PDF) | manual curl run | ✅ passed |
| Security checks (cross-athlete access, role checks, validation, inactive accounts) | manual curl run | ✅ passed |

Not yet verified: UI rendering in a browser, PDF visual layout. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for details and known limitations.

## Documentation
[SETUP](docs/SETUP.md) · [API](docs/API.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [TESTING](docs/TESTING.md) · [PROJECT_STATUS](PROJECT_STATUS.md) · [CONTRACT](docs/CONTRACT.md)

## Layout
`server/` Express + Mongoose API · `server/src/engine/` pure analytics functions · `client/` React + Vite + Tailwind app
