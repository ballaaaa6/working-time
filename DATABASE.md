# Database

Cloudflare D1 uses SQLite. Apply migrations with:

```sh
npm run db:migrate:local
npm run db:migrate:remote
```

## Tables

- `users`: Google subject, unique email, profile name/avatar, role, creation timestamp.
- `work_schedules`: one row per weekday, enabled flag, start/end time, late threshold in minutes. First login creates Monday-Friday 09:00-18:00 and weekend days off, with a 15-minute threshold.
- `attendance`: one row per user/date with status, check-in/out timestamps, and optional note. The unique user/date key prevents duplicate daily records.
- `leave_requests`: one leave date per user, type (`SICK`, `PERSONAL`, `VACATION`), note, and request timestamp. Any submitted leave date is counted as leave in this single-user personal app.

The initial schema is `migrations/0001_initial.sql`. All timestamps are ISO strings; the attendance date key is the Bangkok local date (`YYYY-MM-DD`).
