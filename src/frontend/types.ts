export type User = { name: string; email: string; avatar_url: string | null };
export type Summary = { present: number; late: number; absent: number; leave: number };
export type Schedule = { weekday: number; is_work_day: number | boolean; start_time: string; end_time: string; late_threshold_minutes: number };
export type DayInfo = { date: string; weekday: number; status: string; schedule: Schedule; attendance: null | { status: string; check_in_at: string | null; check_out_at: string | null; note: string | null }; leave: null | { type: string; note: string | null }; warning?: boolean; elapsed_minutes?: number; summary?: Summary; user?: User };
