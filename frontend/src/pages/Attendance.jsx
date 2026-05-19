import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, RefreshCw, Save, Search } from 'lucide-react'
import { api } from '../api'

const STATUS_CONFIG = {
  present: { label: 'Present', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  absent:  { label: 'Absent',  color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  late:    { label: 'Late',    color: '#f59e0b', bg: '#fef3c7', icon: Clock },
}

export default function Attendance() {
  const [students, setStudents] = useState([])
  const [records,  setRecords]  = useState({})
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')

  useEffect(() => { loadStudents() }, [date])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const res = await api.getStudents({ page: 1, page_size: 100 })
      const studentList = res.data.items
      setStudents(studentList)

      // Load today's saved attendance for each student
      const savedRecords = {}
      await Promise.all(
        studentList.map(async (s) => {
          try {
            const attRes = await api.getAttendance(s.id)
            const todayRecord = attRes.data.find(r => r.date === date)
            savedRecords[s.id] = todayRecord ? todayRecord.status : 'present'
          } catch {
            savedRecords[s.id] = 'present'
          }
        })
      )
      setRecords(savedRecords)
    } catch {
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (studentId, status) => {
    setRecords(r => ({ ...r, [studentId]: status }))
    setSaved(false)
  }

  const markAll = (status) => {
    const all = {}
    students.forEach(s => all[s.id] = status)
    setRecords(all)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.markAttendance({
        date,
        records: students.map(s => ({
          student_id: s.id,
          date,
          status: records[s.id] || 'present',
        }))
      })
      setSaved(true)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const counts = {
    present: Object.values(records).filter(s => s === 'present').length,
    absent:  Object.values(records).filter(s => s === 'absent').length,
    late:    Object.values(records).filter(s => s === 'late').length,
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_no.includes(search)
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Attendance</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            Mark daily attendance for all students
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSaved(false) }}
            className="input"
            style={{ width: 160 }}
          />
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            <Save size={14} />
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Attendance'}
          </button>
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

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <div key={status} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: cfg.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <cfg.icon size={20} color={cfg.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{count}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{cfg.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick actions + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Mark all:</span>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <button key={status} onClick={() => markAll(status)} className="btn btn-ghost"
            style={{ fontSize: 12 }}>
            <cfg.icon size={13} color={cfg.color} /> {cfg.label}
          </button>
        ))}
        <button onClick={loadStudents} className="btn btn-ghost">
          <RefreshCw size={13} /> Refresh
        </button>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text3)'
          }} />
          <input className="input" placeholder="Search student..."
            style={{ paddingLeft: 30, width: 200 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Student list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const current = records[s.id] || 'present'
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text2)', width: 100 }}>{s.roll_no}</td>
                    <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                          <button key={status} onClick={() => toggle(s.id, status)}
                            style={{
                              padding: '4px 12px', borderRadius: 20,
                              border: `1px solid ${current === status ? cfg.color : 'var(--border)'}`,
                              background: current === status ? cfg.bg : 'transparent',
                              color: current === status ? cfg.color : 'var(--text3)',
                              fontSize: 12, fontWeight: current === status ? 600 : 400,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
        Showing {filtered.length} of {students.length} students
      </p>
    </div>
  )
}