import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Home, Settings2 } from 'lucide-react';
import { api } from './api';
import type { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/Calendar';
import SettingsPage from './pages/Settings';

export type Page = 'today' | 'calendar' | 'settings';
export default function App() {
  const [user, setUser] = useState<User | null>(null), [checked, setChecked] = useState(false), [page, setPage] = useState<Page>(location.pathname === '/login' ? 'today' : 'today');
  const [error, setError] = useState('');
  async function refreshUser() { try { const result = await api<{ user: User | null }>('/auth/me'); setUser(result.user); } catch { setUser(null); } finally { setChecked(true); } }
  useEffect(() => { void refreshUser(); const onPop = () => setPage(pathToPage(location.pathname)); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  function navigate(next: Page) { const path = next === 'today' ? '/' : `/${next}`; history.pushState({}, '', path); setPage(next); }
  async function logout() { await api('/auth/logout', { method: 'POST' }).catch(() => undefined); setUser(null); history.pushState({}, '', '/login'); }
  if (!checked) return <div className="app-shell"><div className="loading-card"><span className="brand-mark"><Clock3 size={20}/></span><p>กำลังตรวจสอบสถานะ…</p></div></div>;
  if (!user) return <Login onLogin={refreshUser} error={new URLSearchParams(location.search).get('error') ?? error} />;
  return <div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark"><Clock3 size={18}/></span><span>working<span className="brand-accent">time</span></span></div><button className="profile-button" onClick={logout} aria-label="ออกจากระบบ">{user.avatar_url ? <img src={user.avatar_url} /> : <span>{user.name.slice(0,1)}</span>}</button></header>
    <main>{page === 'today' ? <Dashboard user={user} onNavigate={navigate}/> : page === 'calendar' ? <CalendarPage/> : <SettingsPage onError={setError}/>}</main>
    <nav className="bottom-nav"><NavItem active={page==='today'} label="วันนี้" icon={<Home size={20}/>} onClick={()=>navigate('today')}/><NavItem active={page==='calendar'} label="ปฏิทิน" icon={<CalendarDays size={20}/>} onClick={()=>navigate('calendar')}/><NavItem active={page==='settings'} label="ตั้งค่า" icon={<Settings2 size={20}/>} onClick={()=>navigate('settings')}/></nav>
  </div>;
}
function pathToPage(path: string): Page { return path.startsWith('/calendar') ? 'calendar' : path.startsWith('/settings') ? 'settings' : 'today'; }
function NavItem({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) { return <button className={`nav-item ${active?'active':''}`} onClick={onClick}>{icon}<span>{label}</span></button>; }
