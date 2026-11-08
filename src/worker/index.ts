import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

type Env = { Bindings: { DB: D1Database; ASSETS: Fetcher; GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string; GOOGLE_REDIRECT_URI: string; SESSION_SECRET: string; APP_URL: string; TIME_ZONE?: string }; Variables: { user: User } };
type User = { id: string; google_id: string; email: string; name: string; avatar_url: string | null; role: string };
type Schedule = { weekday: number; is_work_day: number; start_time: string; end_time: string; late_threshold_minutes: number };
const app = new Hono<Env>();
const TZ = 'Asia/Bangkok';
const SESSION = 'working_time_session';

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value])) as Record<string, string>;
}
function localDate(d = new Date()) { const p = localParts(d); return `${p.year}-${p.month}-${p.day}`; }
function localTime(d = new Date()) { const p = localParts(d); return `${p.hour}:${p.minute}`; }
function weekday(date: string) { return new Date(`${date}T12:00:00+07:00`).getDay(); }
function id() { return crypto.randomUUID(); }
function b64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
function unb64(text: string) { return Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - text.length % 4) % 4)), c => c.charCodeAt(0)); }
async function sign(value: string, secret: string) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))); }
async function sessionUser(c: any): Promise<User | null> {
  const token = getCookie(c, SESSION); if (!token || !c.env.SESSION_SECRET) return null;
  const [payload, signature] = token.split('.'); if (!payload || !signature) return null;
  try {
    if (await sign(payload, c.env.SESSION_SECRET) !== signature) return null;
    const data = JSON.parse(new TextDecoder().decode(unb64(payload))) as { id: string; exp: number };
    if (data.exp < Date.now()) return null;
    return await c.env.DB.prepare('SELECT id, google_id, email, name, avatar_url, role FROM users WHERE id = ?').bind(data.id).first() as User | null;
  } catch { return null; }
}
function cookieOptions() { return { httpOnly: true as const, secure: true, sameSite: 'Lax' as const, path: '/', maxAge: 60 * 60 * 24 * 14 };
}
async function scheduleFor(c: any, userId: string, date: string): Promise<Schedule> {
  const row = await c.env.DB.prepare('SELECT weekday, is_work_day, start_time, end_time, late_threshold_minutes FROM work_schedules WHERE user_id = ? AND weekday = ?').bind(userId, weekday(date)).first() as Schedule | null;
  return row ?? { weekday: weekday(date), is_work_day: weekday(date) >= 1 && weekday(date) <= 5 ? 1 : 0, start_time: '09:00', end_time: '18:00', late_threshold_minutes: 15 };
}
function minuteOf(s: string) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }
function currentMinute() { const t = localTime(); return minuteOf(t); }
async function recordFor(c: any, userId: string, date: string) { return await c.env.DB.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').bind(userId, date).first() as any; }
async function leaveFor(c: any, userId: string, date: string) { return await c.env.DB.prepare('SELECT * FROM leave_requests WHERE user_id = ? AND date = ?').bind(userId, date).first() as any; }
async function dayInfo(c: any, userId: string, date: string) {
  const [schedule, record, leave] = await Promise.all([scheduleFor(c, userId, date), recordFor(c, userId, date), leaveFor(c, userId, date)]);
  return resolveDay(date, schedule, record, leave);
}
function resolveDay(date: string, schedule: Schedule, record: any, leave: any) {
  const today = localDate();
  let status = 'WORKING';
  if (!schedule.is_work_day) status = 'DAY_OFF';
  else if (leave) status = 'ON_LEAVE';
  else if (record?.check_in_at) status = record.status === 'LATE' ? 'LATE' : 'CHECKED_IN';
  else if (date < today || (date === today && currentMinute() > minuteOf(schedule.start_time) + 30)) status = 'ABSENT';
  else if (date === today && currentMinute() > minuteOf(schedule.start_time) + schedule.late_threshold_minutes) status = 'LATE';
  return { date, weekday: weekday(date), status, schedule: { ...schedule, is_work_day: Boolean(schedule.is_work_day) }, attendance: record ?? null, leave: leave ?? null };
}
function monthDates(month: string) { const [y, m] = month.split('-').map(Number); const count = new Date(Date.UTC(y, m, 0)).getUTCDate(); return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`); }
function validMonth(v: string | undefined) { return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v); }
function jsonError(c: any, message: string, code = 400) { return c.json({ error: message }, code); }
async function monthInfo(c: any, userId: string, month: string) {
  const first = `${month}-01`, dates = monthDates(month), last = dates[dates.length - 1];
  const [scheduleResult, attendanceResult, leaveResult] = await Promise.all([
    c.env.DB.prepare('SELECT weekday, is_work_day, start_time, end_time, late_threshold_minutes FROM work_schedules WHERE user_id = ?').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?').bind(userId, first, last).all(),
    c.env.DB.prepare('SELECT * FROM leave_requests WHERE user_id = ? AND date BETWEEN ? AND ?').bind(userId, first, last).all()
  ]);
  const schedules = new Map<number, Schedule>((scheduleResult.results as Schedule[]).map(s => [s.weekday, s]));
  const attendance = new Map<string, any>((attendanceResult.results as any[]).map(a => [a.date, a]));
  const leaves = new Map<string, any>((leaveResult.results as any[]).map(l => [l.date, l]));
  return dates.map(date => {
    const day = weekday(date), schedule = schedules.get(day) ?? { weekday: day, is_work_day: day >= 1 && day <= 5 ? 1 : 0, start_time: '09:00', end_time: '18:00', late_threshold_minutes: 15 };
    return resolveDay(date, schedule, attendance.get(date), leaves.get(date));
  });
}

// OAuth and session inspection are public; all application data routes require a valid signed cookie.
app.use('/api/*', async (c, next) => {
  if (['/api/auth/me', '/api/auth/google', '/api/auth/google/callback', '/api/auth/logout', '/api/health'].includes(new URL(c.req.url).pathname)) return next();
  const user = await sessionUser(c);
  if (!user) return c.json({ error: 'กรุณาเข้าสู่ระบบ', code: 'UNAUTHENTICATED' }, 401);
  c.set('user', user); await next();
});

app.get('/api/auth/me', async c => { const user = await sessionUser(c); return c.json({ user }); });
app.get('/api/auth/google', c => {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = c.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) return jsonError(c, 'ยังไม่ได้ตั้งค่า Google OAuth ในระบบ', 503);
  const state = b64(crypto.getRandomValues(new Uint8Array(24)));
  setCookie(c, 'working_time_oauth_state', state, cookieOptions());
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID); url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI); url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile'); url.searchParams.set('state', state); url.searchParams.set('prompt', 'select_account');
  return c.redirect(url.toString());
});
app.get('/api/auth/google/callback', async c => {
  const code = c.req.query('code'), state = c.req.query('state');
  if (!code || !state || state !== getCookie(c, 'working_time_oauth_state')) return c.redirect('/login?error=oauth');
  deleteCookie(c, 'working_time_oauth_state', { path: '/' });
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: c.env.GOOGLE_CLIENT_ID, client_secret: c.env.GOOGLE_CLIENT_SECRET, redirect_uri: c.env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }) });
    if (!tokenRes.ok) throw new Error('token');
    const token = await tokenRes.json() as { access_token: string };
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } });
    if (!profileRes.ok) throw new Error('profile');
    const profile = await profileRes.json() as { id: string; email: string; name: string; picture?: string; verified_email?: boolean };
    const email = profile.email.toLowerCase();
    if (!email.endsWith('@gmail.com') || profile.verified_email === false) return c.redirect('/login?error=gmail-only');
    let user = await c.env.DB.prepare('SELECT id, google_id, email, name, avatar_url, role FROM users WHERE google_id = ?').bind(profile.id).first<User>();
    if (!user) {
      const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
      const userId = existing?.id ?? id();
      await c.env.DB.prepare('INSERT INTO users(id, google_id, email, name, avatar_url) VALUES(?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET google_id=excluded.google_id, name=excluded.name, avatar_url=excluded.avatar_url').bind(userId, profile.id, email, profile.name, profile.picture ?? null).run();
      const batch = Array.from({ length: 7 }, (_, i) => c.env.DB.prepare('INSERT OR IGNORE INTO work_schedules(user_id, weekday, is_work_day, start_time, end_time, late_threshold_minutes) VALUES(?,?,?,?,?,15)').bind(userId, i, i >= 1 && i <= 5 ? 1 : 0, '09:00', '18:00'));
      await c.env.DB.batch(batch);
      user = await c.env.DB.prepare('SELECT id, google_id, email, name, avatar_url, role FROM users WHERE id = ?').bind(userId).first<User>();
    }
    if (!user) throw new Error('user');
    const payload = b64(new TextEncoder().encode(JSON.stringify({ id: user.id, exp: Date.now() + 14 * 86_400_000 })));
    setCookie(c, SESSION, `${payload}.${await sign(payload, c.env.SESSION_SECRET)}`, cookieOptions());
    return c.redirect('/');
  } catch { return c.redirect('/login?error=oauth'); }
});
app.post('/api/auth/logout', c => { deleteCookie(c, SESSION, { path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }); return c.json({ ok: true }); });

app.get('/api/today', async c => {
  const user = c.get('user'); const info = await dayInfo(c, user.id, localDate());
  const warning = info.status === 'ABSENT' && info.date === localDate();
  const elapsed = info.attendance?.check_in_at ? Math.max(0, Math.floor((Date.now() - Date.parse(info.attendance.check_in_at)) / 60_000)) : 0;
  const summary = await summaryFor(c, user.id, localDate().slice(0, 7));
  return c.json({ ...info, warning, elapsed_minutes: elapsed, summary, user: { name: user.name, email: user.email, avatar_url: user.avatar_url } });
});
app.post('/api/attendance/check-in', async c => {
  const user = c.get('user'), date = localDate(), info = await dayInfo(c, user.id, date);
  if (!info.schedule.is_work_day || info.leave) return jsonError(c, 'วันนี้ไม่ใช่วันทำงาน');
  if (info.attendance?.check_in_at) return jsonError(c, 'คุณเช็กชื่อเข้างานแล้ว');
  const now = new Date().toISOString(), status = currentMinute() > minuteOf(info.schedule.start_time) + info.schedule.late_threshold_minutes ? 'LATE' : 'PRESENT';
  await c.env.DB.prepare('INSERT INTO attendance(id,user_id,date,status,check_in_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status, check_in_at=excluded.check_in_at').bind(id(), user.id, date, status, now).run();
  return c.json(await dayInfo(c, user.id, date));
});
app.post('/api/attendance/check-out', async c => {
  const user = c.get('user'), date = localDate(), record = await recordFor(c, user.id, date);
  if (!record?.check_in_at) return jsonError(c, 'กรุณาเช็กชื่อเข้างานก่อน');
  if (record.check_out_at) return jsonError(c, 'คุณเช็กชื่อออกงานแล้ว');
  await c.env.DB.prepare('UPDATE attendance SET check_out_at = ? WHERE user_id = ? AND date = ?').bind(new Date().toISOString(), user.id, date).run();
  return c.json(await dayInfo(c, user.id, date));
});
app.get('/api/attendance', async c => {
  const month = c.req.query('month'); if (!validMonth(month)) return jsonError(c, 'รูปแบบเดือนต้องเป็น YYYY-MM');
  const user = c.get('user');
  return c.json({ days: await monthInfo(c, user.id, month!) });
});
async function summaryFor(c: any, userId: string, month: string) {
  const days = (await monthInfo(c, userId, month)).filter(d => d.date <= localDate());
  return { present: days.filter(d => d.status === 'CHECKED_IN' || (d.status === 'WORKING' && d.attendance)).length, late: days.filter(d => d.status === 'LATE' && d.attendance?.check_in_at).length, absent: days.filter(d => d.status === 'ABSENT').length, leave: days.filter(d => d.status === 'ON_LEAVE').length };
}
app.get('/api/summary', async c => { const month = c.req.query('month'); if (!validMonth(month)) return jsonError(c, 'รูปแบบเดือนต้องเป็น YYYY-MM'); return c.json(await summaryFor(c, c.get('user').id, month!)); });
app.get('/api/schedule', async c => { const rows = await c.env.DB.prepare('SELECT weekday, is_work_day, start_time, end_time, late_threshold_minutes FROM work_schedules WHERE user_id = ? ORDER BY weekday').bind(c.get('user').id).all<Schedule>(); return c.json({ schedule: rows.results }); });
app.put('/api/schedule', async c => {
  const body = await c.req.json<{ schedule?: Schedule[] }>();
  if (!Array.isArray(body.schedule) || body.schedule.length !== 7 || body.schedule.some(s => !Number.isInteger(s.weekday) || s.weekday < 0 || s.weekday > 6 || !/^\d{2}:\d{2}$/.test(s.start_time) || !/^\d{2}:\d{2}$/.test(s.end_time) || !Number.isInteger(s.late_threshold_minutes) || s.late_threshold_minutes < 0 || s.late_threshold_minutes > 180)) return jsonError(c, 'ข้อมูลตารางงานไม่ถูกต้อง');
  await c.env.DB.batch(body.schedule.map(s => c.env.DB.prepare('INSERT INTO work_schedules(user_id,weekday,is_work_day,start_time,end_time,late_threshold_minutes) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,weekday) DO UPDATE SET is_work_day=excluded.is_work_day,start_time=excluded.start_time,end_time=excluded.end_time,late_threshold_minutes=excluded.late_threshold_minutes').bind(c.get('user').id, s.weekday, s.is_work_day ? 1 : 0, s.start_time, s.end_time, s.late_threshold_minutes)));
  return c.json({ ok: true });
});
app.post('/api/leave', async c => {
  const body = await c.req.json<{ date?: string; type?: string; note?: string }>();
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !['SICK', 'PERSONAL', 'VACATION'].includes(body.type ?? '')) return jsonError(c, 'กรุณากรอกข้อมูลการลาให้ครบ');
  try { await c.env.DB.prepare('INSERT INTO leave_requests(id,user_id,date,type,note) VALUES(?,?,?,?,?)').bind(id(), c.get('user').id, body.date, body.type, (body.note ?? '').slice(0, 500)).run(); }
  catch { return jsonError(c, 'มีคำขอลาวันนี้แล้ว'); }
  return c.json({ ok: true });
});
app.get('/api/leave', async c => { const rows = await c.env.DB.prepare('SELECT id,date,type,note,created_at FROM leave_requests WHERE user_id = ? ORDER BY date DESC LIMIT 180').bind(c.get('user').id).all(); return c.json({ leaves: rows.results }); });

app.get('/api/health', c => c.json({ ok: true }));
app.notFound(async c => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'ไม่พบ API' }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});
app.onError((err, c) => { console.error('Working Time API error', err); return c.json({ error: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง' }, 500); });
export default app;
