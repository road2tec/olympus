# Olympus — Setup

## Prerequisites
- Node.js 20+ (developed on 24), npm 10+
- MongoDB 6/7 running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas URI

## 1. Install
```powershell
cd server ; npm install
cd ..\client ; npm install
```

## 2. Configure
```powershell
cd server
copy .env.example .env      # then edit .env
```
Set `JWT_SECRET` to a random string of 32+ characters (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Set `MONGODB_URI` for local MongoDB or Atlas. `.env` is git-ignored; never commit it.

The client needs no configuration in development (Vite proxies `/api` to `http://localhost:5000`). To point at another API host, copy `client/.env.example` to `client/.env` and set `VITE_API_URL`.

## 3. Seed demo data (development only)
```powershell
cd server
npm run seed
```
Safe to re-run (upserts). Refuses to run when `NODE_ENV=production`.

| Role | Email | Password |
|---|---|---|
| Athlete (fictional "Arjun Rao") | athlete@olympus.demo | Athlete@123 |
| Coach (fictional "Meera Iyer") | coach@olympus.demo | Coach@12345 |
| Admin | admin@olympus.demo | Admin@12345 |

These are demo credentials for local development only. Never use them in production.

## 4. Run
```powershell
# terminal 1
cd server ; npm run dev       # http://localhost:5000/api/v1/health
# terminal 2
cd client ; npm run dev       # http://localhost:5173
```

## 5. Test / build
```powershell
cd server ; npm test          # needs MongoDB; uses database "olympus_test"
cd client ; npm test ; npm run build
```

## Backups
- Local: `mongodump --uri="mongodb://127.0.0.1:27017/olympus" --out=backup\<date>`; restore with `mongorestore`.
- Atlas: enable Cloud Backup (continuous or scheduled snapshots) in the cluster settings.
- Schedule dumps (Task Scheduler / cron) and store them off the machine. Never store backups containing real athlete data in the repository.

## Token storage note
The JWT is sent in an `Authorization: Bearer` header and kept in `sessionStorage` (cleared when the tab closes). Any script injected into the page (XSS) could read it, so the app avoids `dangerouslySetInnerHTML`, ships Helmet headers, and uses short token lifetimes (default 2h). For a production deployment on a single origin, migrating to an `HttpOnly; Secure; SameSite=Strict` cookie is the recommended hardening step.
