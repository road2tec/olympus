# Olympus API (`/api/v1`)

Full field-level contract: [CONTRACT.md §3–§8](CONTRACT.md). Summary:

Success: `{ "success": true, "data": ..., "meta"?: {page,limit,total,totalPages} }`
Error: `{ "success": false, "error": { "code", "message", "subcode"?, "details"? } }`
Auth: `Authorization: Bearer <jwt>`. Strict bodies: unknown fields return 400.

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /health | public | status + db |
| POST | /auth/register | public | athlete only; `{name,email,password,phone?}` |
| POST | /auth/login | public | returns `{user, token, expiresIn(seconds)}` |
| GET | /auth/me | any | user + profile |
| GET/POST/PATCH | /athlete/profile | athlete | 404 subcode PROFILE_NOT_FOUND; 409 on duplicate create |
| POST | /daily-entries | athlete | 201 `{entry,twin,previousTwin,insight,attention}`; 409 subcode DUPLICATE_DATE |
| GET | /daily-entries | athlete | `page,limit,from,to` |
| GET/PATCH | /daily-entries/:id | athlete | owner only (404 otherwise); no DELETE |
| GET | /twin/current, /twin/history | athlete | |
| GET | /insights, /insights/latest | athlete | |
| POST | /reports/generate | athlete | `{weekStart?}`; 201 new / 200 regenerated |
| GET | /reports, /reports/:id | athlete | owner only |
| GET | /reports/:id/pdf | athlete | `application/pdf` |
| GET | /admin/users | admin | `page,limit,role,q` |
| PATCH | /admin/users/:id/status | admin | `{isActive}`; cannot deactivate self |
| GET | /coach/athletes, /coach/athletes/:athleteId/twin | coach | assigned athletes only |

Example:
```bash
curl -X POST localhost:5000/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"athlete@olympus.demo","password":"Athlete@123"}'
curl localhost:5000/api/v1/twin/current -H "Authorization: Bearer $TOKEN"
```
