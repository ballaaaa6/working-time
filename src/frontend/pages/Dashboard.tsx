import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CircleAlert, Clock3, LogIn, LogOut, Sparkles } from 'lucide-react';
import { api, statusLabel, thDate, time } from '../api';
import type { DayInfo, User } from '../types';
import type { Page } from '../App';

const weekdayFull: Intl.DateTimeFormatOptions = { weekday: 'long' };
export default function Dashboard({ user, onNavigate }: { user: User; onNavigate: (page: Page) => void }) {
  const [today, setToday] = useState<DayInfo | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
  const load = useCallback(async () => { try { setToday(await api<DayInfo>('/today')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'); } }, []);
  useEffect(() => { void load(); const timer = setInterval(() => { setNow(Date.now()); void load(); }, 60_000); return () => clearInterval(timer); }, [load]);
  async function punch(kind: 'check-in'|'check-out') { setBusy(true); try { const info = await api<DayInfo>(`/attendance/${kind}`, { method: 'POST' }); setToday(info); await load(); setError(''); } catch(e) { setError(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ'); } finally { setBusy(false); } }
  const status = today?.status ?? 'WORKING', hasCheckin = !!today?.attendance?.check_in_at, checkedOut = !!today?.attendance?.check_out_at;
  const elapsed = hasCheckin && !checkedOut ? Math.max(0, Math.floor((now - Date.parse(today!.attendance!.check_in_at!)) / 60_000)) : 0;
  const isWorking = !!today?.schedule.is_work_day && status !== 'DAY_OFF' && status !== 'ON_LEAVE';
  const badgeKind = status === 'ABSENT' ? 'danger' : status === 'LATE' ? 'late' : status === 'DAY_OFF' ? 'off' : status === 'ON_LEAVE' ? 'leave' : hasCheckin ? 'success' : 'work';
  return <div className="page-content dashboard-page"><div className="greeting-row"><div><p className="eyebrow">สวัสดี, {user.name.split(' ')[0]}</p><h1>วันนี้ของคุณ</h1></div><span className="today-dot"><span/> LIVE</span></div>
    <section className={`today-card ${badgeKind}`}><div className="today-card-top"><div><p className="date-big">{today ? thDate(today.date, { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'}</p><p className="day-name">{today ? thDate(today.date, weekdayFull) : 'กำลังโหลด…'}</p></div><span className={`status-pill ${badgeKind}`}>{statusLabel[status] ?? statusLabel.WORKING}</span></div>
      <div className="schedule-line"><span className={`schedule-icon ${isWorking?'':'muted'}`}><Clock3 size={17}/></span><span>{isWorking ? `${today?.schedule.start_time ?? '09:00'} – ${today?.schedule.end_time ?? '18:00'}` : status === 'DAY_OFF' ? 'พักผ่อนให้เต็มที่นะ' : status === 'ON_LEAVE' ? 'ขอให้เป็นวันที่ดี' : '—'}</span><span className="schedule-caption">{isWorking ? 'เวลาทำงาน' : ''}</span></div>
      {hasCheckin ? <div className="attendance-live"><div className="time-pair"><div><span className="small-label">เข้างาน</span><strong>{time(today?.attendance?.check_in_at)}</strong></div><div className="pair-divider"/><div><span className="small-label">ออกงาน</span><strong>{checkedOut ? time(today?.attendance?.check_out_at) : '— — : — —'}</strong></div></div>{!checkedOut && <div className="duration"><span className="pulse-dot"/>ทำงานมาแล้ว <strong>{Math.floor(elapsed/60)} ชม. {elapsed%60} นาที</strong></div>}</div> : <div className="no-checkin"><span className="no-checkin-icon"><Sparkles size={16}/></span><span>{status === 'ABSENT' ? 'ยังไม่ได้เช็คชื่อ' : status === 'LATE' ? 'เลยเวลาเข้างานแล้ว' : isWorking ? 'พร้อมแล้ว? แตะเพื่อเช็กชื่อเข้างาน' : 'วันนี้ไม่มีตารางเข้างาน'}</span></div>}
      {isWorking && <div className="action-row"><button className="punch-button checkin" disabled={busy||hasCheckin} onClick={()=>void punch('check-in')}><LogIn size={19}/>{hasCheckin?'เข้างานแล้ว':'เข้างาน'}</button><button className="punch-button checkout" disabled={busy||!hasCheckin||checkedOut} onClick={()=>void punch('check-out')}><LogOut size={19}/>{checkedOut?'ออกงานแล้ว':'ออกงาน'}</button></div>}
      {today?.warning && <div className="warning-banner"><CircleAlert size={17}/><span>ยังไม่ได้เช็คชื่อ กรุณาตรวจสอบกับหัวหน้างาน</span></div>}
    </section>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <div className="section-heading"><h2>สรุปเดือนนี้</h2><button onClick={()=>onNavigate('calendar')}>ดูประวัติ <ArrowRight size={15}/></button></div>
    <section className="summary-grid"><SummaryTile label="มาทำงาน" value={today?.summary?.present ?? '—'} unit="วัน" color="green" icon="✓"/><SummaryTile label="มาสาย" value={today?.summary?.late ?? '—'} unit="ครั้ง" color="amber" icon="◷"/><SummaryTile label="ขาดงาน" value={today?.summary?.absent ?? '—'} unit="วัน" color="red" icon="!"/><SummaryTile label="วันลา" value={today?.summary?.leave ?? '—'} unit="วัน" color="blue" icon="↗"/></section>
    <button className="history-link" onClick={()=>onNavigate('calendar')}><span className="history-icon"><Clock3 size={18}/></span><span><strong>ดูประวัติการทำงาน</strong><small>ตรวจสอบเวลาเข้าออกย้อนหลัง</small></span><ArrowRight size={18}/></button>
  </div>;
}
function SummaryTile({ label, value, unit, color, icon }: { label:string; value:number|string; unit:string; color:string; icon:string }) { return <div className="summary-tile"><div className={`tile-icon ${color}`}>{icon}</div><strong>{value}<small>{unit}</small></strong><span>{label}</span></div>; }
