import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, RefreshCw, Save, Search, Calendar, List } from 'lucide-react'
import { api } from '../api'

const STATUS_CONFIG = {
  present: { label: 'Present', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  absent:  { label: 'Absent',  color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  late:    { label: 'Late',    color: '#f59e0b', bg: '#fef3c7', icon: Clock },
}

const STATUS_COLORS = {
  present: '#22c55e',
  absent:  '#ef4444',
  late:    '#f59e0b',
  null:    '#e5e7eb',
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function Attendance() {
  const [tab,      setTab]      = useState('mark')
  const [students, setStudents] = useState([])
  const [records,  setRecords]  = useState({})
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')

  // History tab state
  const [histStudent,  setHistStudent]  = useState(null)
  const [histRecords,  setHistRecords]  = useState([])
  const [histLoading,  setHistLoading]  = useState(false)
  const [histMonth,    setHistMonth]    = useState(new Date().getMonth())
  const [histYear,     setHistYear]     = useState(new Date().getFullYear())
  const [histSearch,   setHistSearch]   = useState('')

  useEffect(() => { loadStudents() }, [date])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const res = await api.getStudents({ page: 1, page_size: 100 })
      const studentList = res.data.items
      setStudents(studentList)
      const savedRecords = {}
      await Promise.all(studentList.map(async (s) => {
        try {
          const attRes = await api.getAttendance(s.id)
          const todayRecord = attRes.data.find(r => r.date === date)
          savedRecords[s.id] = todayRecord ? todayRecord.status : 'present'
        } catch {
          savedRecords[s.id] = 'present'
        }
      }))
      setRecords(savedRecords)
    } catch {
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (student) => {
    setHistStudent(student)
    setHistLoading(true)
    try {
      const res = await api.getAttendance(student.id)
      setHistRecords(res.data)
    } catch {
      setHistRecords([])
    } finally {
      setHistLoading(false)
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
          student_id: s.id, date,
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

  // Build calendar data for history
  const daysInMonth = getDaysInMonth(histYear, histMonth)
  const firstDay = getFirstDayOfMonth(histYear, histMonth)
  const monthName = new Date(histYear, histMonth).toLocaleString('default', { month: 'long' })

  const recordMap = {}
  histRecords.forEach(r => { recordMap[r.date] = r.status })

  const histFiltered = students.filter(s =>
    s.full_name.toLowerCase().includes(histSearch.toLowerCase()) ||
    s.roll_no.includes(histSearch)
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Attendance</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>Mark and view student attendance</p>
        </div>
        {tab === 'mark' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={date}
              onChange={e => { setDate(e.target.value); setSaved(false) }}
              className="input" style={{ width: 160 }} />
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              <Save size={14} />
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { id: 'mark',    label: 'Mark Attendance', icon: List },
          { id: 'history', label: 'Student History',  icon: Calendar },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontSize: 13, fontWeight: 500,
              color: tab === t.id ? 'var(--primary)' : 'var(--text2)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* MARK ATTENDANCE TAB */}
      {tab === 'mark' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {Object.entries(counts).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Mark all:</span>
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
              <button key={status} onClick={() => markAll(status)} className="btn btn-ghost" style={{ fontSize: 12 }}>
                <cfg.icon size={13} color={cfg.color} /> {cfg.label}
              </button>
            ))}
            <button onClick={loadStudents} className="btn btn-ghost"><RefreshCw size={13} /> Refresh</button>
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input className="input" placeholder="Search student..."
                style={{ paddingLeft: 30, width: 200 }}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Roll No</th><th>Name</th><th>Status</th></tr>
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
        </>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

          {/* Student list */}
          <div>
            <input className="input" placeholder="Search student..."
              style={{ width: '100%', marginBottom: 12 }}
              value={histSearch} onChange={e => setHistSearch(e.target.value)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {histFiltered.map(s => (
                <div key={s.id}
                  onClick={() => loadHistory(s)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: histStudent?.id === s.id ? 'var(--primary)' : 'var(--bg2)',
                    color: histStudent?.id === s.id ? 'white' : 'var(--text)',
                    border: `1px solid ${histStudent?.id === s.id ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Roll {s.roll_no}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar view */}
          <div>
            {!histStudent ? (
              <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
                <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ fontSize: 14 }}>Select a student to view attendance history</div>
              </div>
            ) : (
              <div className="card">
                {/* Calendar header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{histStudent.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>Roll {histStudent.roll_no}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => {
                      if (histMonth === 0) { setHistMonth(11); setHistYear(y => y - 1) }
                      else setHistMonth(m => m - 1)
                    }} className="btn btn-ghost" style={{ padding: '4px 10px' }}>←</button>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', minWidth: 120, textAlign: 'center' }}>
                      {monthName} {histYear}
                    </span>
                    <button onClick={() => {
                      if (histMonth === 11) { setHistMonth(0); setHistYear(y => y + 1) }
                      else setHistMonth(m => m + 1)
                    }} className="btn btn-ghost" style={{ padding: '4px 10px' }}>→</button>
                  </div>
                </div>

                {/* Stats for this month */}
                {(() => {
                  const monthRecords = histRecords.filter(r => {
                    const d = new Date(r.date)
                    return d.getMonth() === histMonth && d.getFullYear() === histYear
                  })
                  const present = monthRecords.filter(r => r.status === 'present').length
                  const absent  = monthRecords.filter(r => r.status === 'absent').length
                  const late    = monthRecords.filter(r => r.status === 'late').length
                  const total   = monthRecords.length
                  const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : 0

                  return (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      {[
                        { label: 'Present', value: present, color: '#22c55e', bg: '#dcfce7' },
                        { label: 'Absent',  value: absent,  color: '#ef4444', bg: '#fee2e2' },
                        { label: 'Late',    value: late,    color: '#f59e0b', bg: '#fef3c7' },
                        { label: 'Rate',    value: `${pct}%`, color: pct < 75 ? '#ef4444' : '#22c55e', bg: pct < 75 ? '#fee2e2' : '#dcfce7' },
                      ].map(item => (
                        <div key={item.label} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: item.bg, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
                          <div style={{ fontSize: 11, color: item.color, opacity: 0.8 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Calendar grid */}
                {histLoading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>
                ) : (
                  <>
                    {/* Day names */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '4px 0' }}>{d}</div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {/* Empty cells for first day offset */}
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}

                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1
                        const dateStr = `${histYear}-${String(histMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const status = recordMap[dateStr]
                        const isToday = dateStr === new Date().toISOString().split('T')[0]
                        const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6

                        return (
                          <div key={day} style={{
                            aspectRatio: '1',
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: isToday ? 700 : 400,
                            background: status ? STATUS_COLORS[status] : isWeekend ? 'var(--bg3)' : 'var(--bg2)',
                            color: status ? 'white' : isWeekend ? 'var(--text3)' : 'var(--text)',
                            border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                            cursor: 'default',
                            title: status || '',
                          }}>
                            {day}
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
                      {[
                        { label: 'Present', color: '#22c55e' },
                        { label: 'Absent',  color: '#ef4444' },
                        { label: 'Late',    color: '#f59e0b' },
                        { label: 'No record', color: 'var(--bg2)', border: '1px solid var(--border)' },
                        { label: 'Weekend', color: 'var(--bg3)' },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, border: item.border, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
