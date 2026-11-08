export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers }, credentials: 'include' });
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error ?? 'ไม่สามารถเชื่อมต่อได้'); }
  return response.json() as Promise<T>;
}
export const monthNow = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(new Date());
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const thDate = (d: string | Date, options: Intl.DateTimeFormatOptions = {}) => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', ...options }).format(typeof d === 'string' ? new Date(`${d}T12:00:00+07:00`) : d);
export const time = (value?: string | null) => value ? new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)) : '—';
export const statusLabel: Record<string, string> = { WORKING: 'วันนี้ทำงาน', DAY_OFF: 'วันหยุด', CHECKED_IN: 'เข้างานแล้ว', LATE: 'มาสาย', ABSENT: 'ขาดงาน', ON_LEAVE: 'ลา' };
