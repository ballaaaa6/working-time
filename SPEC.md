# Product specification

## Goal

Working Time is a mobile-first attendance check application. A signed-in Gmail user should understand within two seconds whether today is a work day and what their attendance status is.

## Audience and locale

- One personal profile per Google account; Gmail addresses only.
- Thai UI (`th-TH`), `DD/MM/YYYY` date display, `Asia/Bangkok` attendance day boundary.
- Usable on a phone and centered at 480px maximum width on desktop.

## Main workflows

1. Sign in through Google OAuth and receive a secure server-side session cookie.
2. View today's date, weekday, work/off status, shift, check-in/out, and monthly totals.
3. Check in or check out with one tap; see elapsed work time while checked in.
4. Configure work weekdays, start/end times, and late threshold.
5. Browse monthly attendance in a color-coded calendar or list, inspect a date, export CSV, and submit a leave date/type/note.

## Status behavior

The dashboard derives `WORKING`, `DAY_OFF`, `CHECKED_IN`, `LATE`, `ABSENT`, or `ON_LEAVE` from schedule, leave, attendance, and Bangkok time. Persistent attendance status values remain `PRESENT`, `LATE`, `ABSENT`, `LEAVE`, or `DAY_OFF`. A day without a check-in becomes absent after the scheduled start plus 30 minutes; before then it can show a late warning after the configured threshold. Leave dates take precedence over absence.

## Acceptance

- `npm run build` finishes without TypeScript errors.
- Google Gmail OAuth works when correctly configured for a deployed Worker.
- Check-in/out is stored in D1 and reappears after reload.
- Calendar/history and CSV show real D1-backed attendance.
- Deploy uses one Cloudflare Worker with static assets and D1.
