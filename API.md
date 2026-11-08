# API reference

All application routes use JSON and require the signed session cookie except the OAuth routes and `GET /api/auth/me`. Unauthenticated protected requests return `401`.

| Method | Route | Behavior |
|---|---|---|
| GET | `/api/auth/me` | Current profile or `{ "user": null }` |
| GET | `/api/auth/google` | Begin Google OAuth |
| GET | `/api/auth/google/callback` | Complete OAuth, create/upsert user and session |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/today` | Today status, shift, event data, live duration, warning, month summary |
| POST | `/api/attendance/check-in` | Record today's check-in; late threshold is applied |
| POST | `/api/attendance/check-out` | Record today's check-out |
| GET | `/api/attendance?month=YYYY-MM` | Daily status details for a month |
| GET | `/api/summary?month=YYYY-MM` | Present, late, absent, and leave totals |
| GET | `/api/schedule` | User's seven weekday schedule rows |
| PUT | `/api/schedule` | Replace weekday settings; body `{ "schedule": [...] }` |
| POST | `/api/leave` | Create `{ "date": "YYYY-MM-DD", "type": "SICK|PERSONAL|VACATION", "note": "..." }` |
| GET | `/api/leave` | Recent leave requests |

Dashboard status names are presentation values (`WORKING`, `DAY_OFF`, `CHECKED_IN`, `LATE`, `ABSENT`, `ON_LEAVE`). Attendance table values follow the persistent enum in `DATABASE.md`.
