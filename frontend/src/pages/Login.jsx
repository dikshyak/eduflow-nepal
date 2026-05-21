import { useState } from 'react'
import { Sun, Moon, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'

export default function Login({ onLogin, dark, toggleDark }) {
  const [email,    setEmail]    = useState('admin@kms.edu.np')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return setError('Please fill all fields')
    setLoading(true)
    setError('')
    try {
      const res = await api.login({ email, password })
      localStorage.setItem('access_token',  res.data.access_token)
      localStorage.setItem('refresh_token', res.data.refresh_token)
      localStorage.setItem('user_role',     res.data.user_role)
      localStorage.setItem('school_id',     res.data.school_id)
      onLogin(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg)',
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1, background: 'var(--primary)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '3rem',
        display: window.innerWidth < 768 ? 'none' : 'flex',
      }}>
        <div style={{ color: 'white' }}>
          <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>EduFlow Nepal</div>
          <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 32 }}>
            Modern School ERP Platform
          </div>
          {[
            'Multi-school management',
            'Real-time attendance tracking',
            'AI-powered analytics',
            'Automated fee reminders',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, opacity: 0.9 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
              <span style={{ fontSize: 14 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '3rem 2.5rem',
        position: 'relative',
      }}>
        {/* Dark mode toggle */}
        <button onClick={toggleDark} className="btn btn-ghost"
          style={{ position: 'absolute', top: 24, right: 24 }}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Welcome back
          </div>
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>
            Sign in to your school dashboard
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5',
            color: '#991b1b', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
            Email address
          </label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="admin@kms.edu.np"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{ paddingRight: 40 }}
            />
            <button onClick={() => setShowPw(p => !p)}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)',
              }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '11px 16px', fontSize: 14 }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div style={{
          marginTop: 24, padding: 14,
          background: 'var(--bg3)', borderRadius: 8,
          fontSize: 12, color: 'var(--text2)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Demo credentials</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>🔑 Admin</div>
            <div>Email: admin@kms.edu.np</div>
            <div>Password: Admin@1234</div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>👨‍🏫 Teacher</div>
            <div>Email: teacher@kms.edu.np</div>
            <div>Password: Teacher@1234</div>
          </div>
        </div>
      </div>
    </div>
  )
}