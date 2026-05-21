import { useState } from 'react'
import { Sun, Moon, LogOut, Users, CalendarCheck, BarChart3, DollarSign, Bot } from 'lucide-react'
import Login from './pages/Login'
import Students from './pages/Students'
import Attendance from './pages/Attendance'
import Marks from './pages/Marks'
import Fees from './pages/Fees'
import AIChat from './pages/AIChat'
import Dashboard from './pages/Dashboard'

const ALL_NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: BarChart3,    roles: ['school_admin', 'super_admin', 'teacher'] },
  { id: 'students',   label: 'Students',   icon: Users,        roles: ['school_admin', 'super_admin', 'teacher'] },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, roles: ['school_admin', 'super_admin', 'teacher'] },
  { id: 'marks',      label: 'Marks',      icon: BarChart3,    roles: ['school_admin', 'super_admin', 'teacher'] },
  { id: 'fees',       label: 'Fees',       icon: DollarSign,   roles: ['school_admin', 'super_admin'] },
  { id: 'ai',         label: 'AI Chat',    icon: Bot,          roles: ['school_admin', 'super_admin'] },
]

export default function App() {
  const [user,  setUser]  = useState(() => {
    const token = localStorage.getItem('access_token')
    const role = localStorage.getItem('user_role')
    return token ? { role } : null
  })
  const [dark,  setDark]  = useState(false)
  const [page,  setPage]  = useState(() => localStorage.getItem('current_page') || 'students')

  const handleLogin  = (data) => { setUser({ role: data.user_role }) }
  const handleLogout = () => { localStorage.clear(); setUser(null) }
  const toggleDark   = () => {
    setDark(d => {
      document.documentElement.classList.toggle('dark', !d)
      return !d
    })
  }

  const NAV = ALL_NAV.filter(n => n.roles.includes(user?.role))

  if (!user) return <Login onLogin={handleLogin} dark={dark} toggleDark={toggleDark} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '1.25rem 0',
      }}>
        <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>E</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>EduFlow</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, letterSpacing: '0.05em' }}>NEPAL ERP</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0.75rem' }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setPage(id); localStorage.setItem('current_page', id) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: page === id ? 'var(--primary)' : 'transparent',
                color: page === id ? 'white' : 'var(--text2)',
                fontSize: 13, fontWeight: page === id ? 600 : 400,
                marginBottom: 2, transition: 'all 0.15s',
              }}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button onClick={toggleDark} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {page === 'dashboard'  && <Dashboard />}
        {page === 'students'   && <Students />}
        {page === 'attendance' && <Attendance />}
        {page === 'marks' && <Marks />}
        {page === 'fees' && <Fees />}
        {page === 'ai' && <AIChat />}
      </main>
    </div>
  )
}

function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      <div style={{ color: 'var(--text2)' }}>Coming soon — building step by step</div>
    </div>
  )
}