import { useState } from 'react'
import { Sun, Moon, LogOut, Users, CalendarCheck, BarChart3, DollarSign, Bot } from 'lucide-react'
import Login from './pages/Login'
import Students from './pages/Students'
import Attendance from './pages/Attendance'
import Marks from './pages/Marks'

const NAV = [
  { id: 'students',   label: 'Students',   icon: Users },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'marks',      label: 'Marks',      icon: BarChart3 },
  { id: 'fees',       label: 'Fees',       icon: DollarSign },
  { id: 'ai',         label: 'AI Chat',    icon: Bot },
]

export default function App() {
  const [user,  setUser]  = useState(() => localStorage.getItem('access_token') ? {} : null)
  const [dark,  setDark]  = useState(false)
  const [page,  setPage]  = useState('students')

  const handleLogin  = (data) => setUser(data)
  const handleLogout = () => { localStorage.clear(); setUser(null) }
  const toggleDark   = () => {
    setDark(d => {
      document.documentElement.classList.toggle('dark', !d)
      return !d
    })
  }

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
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>EduFlow</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>School ERP Nepal</div>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0.75rem' }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id)}
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
        {page === 'students'   && <Students />}
        {page === 'attendance' && <Attendance />}
        {page === 'marks' && <Marks />}
        {page === 'fees'       && <ComingSoon title="Fees" />}
        {page === 'ai'         && <ComingSoon title="AI Chat" />}
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