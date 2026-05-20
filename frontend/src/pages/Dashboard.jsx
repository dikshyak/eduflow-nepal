import { useState, useEffect } from 'react'
import { Users, CalendarCheck, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { api } from '../api'

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']

export default function Dashboard() {
  const [students,    setStudents]    = useState([])
  const [fees,        setFees]        = useState([])
  const [exams,       setExams]       = useState([])
  const [lowAtt,      setLowAtt]      = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [stRes, feesRes, examsRes, lowRes] = await Promise.all([
        api.getStudents({ page: 1, page_size: 100 }),
        api.getFees(),
        api.getExams(),
        api.getLowAttendance(),
      ])
      setStudents(stRes.data.items)
      setFees(feesRes.data)
      setExams(examsRes.data)
      setLowAtt(lowRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const totalStudents  = students.length
  const feePaid        = fees.filter(f => f.status === 'paid').length
  const feePending     = fees.filter(f => f.status === 'pending' || f.status === 'overdue').length
  const feeCollected   = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const atRisk         = lowAtt.filter(s => s.percentage < 75).length

  // Fee pie data
  const feePieData = [
    { name: 'Paid',    value: fees.filter(f => f.status === 'paid').length },
    { name: 'Pending', value: fees.filter(f => f.status === 'pending').length },
    { name: 'Overdue', value: fees.filter(f => f.status === 'overdue').length },
    { name: 'Waived',  value: fees.filter(f => f.status === 'waived').length },
  ].filter(d => d.value > 0)

  // Attendance bar data
  const attBarData = lowAtt.slice(0, 10).map(s => ({
    name: s.full_name.split(' ')[0],
    attendance: s.percentage,
  }))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text3)' }}>
      Loading dashboard...
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Dashboard</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
          Kathmandu Model School — overview
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Students', value: totalStudents, icon: Users, color: '#3b82f6', bg: '#dbeafe' },
          { label: 'Fee Collected', value: `NPR ${feeCollected.toLocaleString()}`, icon: DollarSign, color: '#22c55e', bg: '#dcfce7' },
          { label: 'Fee Pending', value: feePending, icon: TrendingUp, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'At Risk Students', value: atRisk, icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
        ].map(card => (
          <div key={card.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <card.icon size={22} color={card.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Fee status pie */}
        <div className="card">
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 16, fontSize: 14 }}>Fee Status Distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={feePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {feePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Low attendance bar */}
        <div className="card">
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 16, fontSize: 14 }}>
            Low Attendance Students
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>bottom 10</span>
          </p>
          {attBarData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
              All students have good attendance 🎉
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                <Bar dataKey="attendance" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {attBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.attendance < 75 ? '#ef4444' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Exams + At risk students */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent exams */}
        <div className="card">
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 12, fontSize: 14 }}>Recent Exams</p>
          {exams.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No exams yet</p>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)', padding: '4px 0', fontWeight: 500 }}>Exam</th>
                  <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)', padding: '4px 0', fontWeight: 500 }}>Subject</th>
                  <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)', padding: '4px 0', fontWeight: 500 }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {exams.slice(0, 5).map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: 13, padding: '6px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{e.name}</td>
                    <td style={{ fontSize: 13, padding: '6px 0', color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>{e.subject}</td>
                    <td style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="badge badge-blue">{e.exam_type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* At risk students */}
        <div className="card">
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 12, fontSize: 14 }}>
            At Risk Students
            <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 400, marginLeft: 8 }}>below 75% attendance</span>
          </p>
          {lowAtt.filter(s => s.percentage < 75).length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No at-risk students 🎉</p>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)', padding: '4px 0', fontWeight: 500 }}>Student</th>
                  <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)', padding: '4px 0', fontWeight: 500 }}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {lowAtt.filter(s => s.percentage < 75).slice(0, 6).map(s => (
                  <tr key={s.student_id}>
                    <td style={{ fontSize: 13, padding: '6px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{s.full_name}</td>
                    <td style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{s.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}