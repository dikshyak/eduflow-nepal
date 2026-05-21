import { useState, useEffect } from 'react'
import { Users, DollarSign, AlertTriangle, TrendingUp, BookOpen, Award, Clock, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { api } from '../api'

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']

export default function Dashboard() {
  const [students, setStudents] = useState([])
  const [fees,     setFees]     = useState([])
  const [exams,    setExams]    = useState([])
  const [lowAtt,   setLowAtt]   = useState([])
  const [loading,  setLoading]  = useState(true)

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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const totalStudents  = students.length
  const feeCollected   = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const feeTotal       = fees.filter(f => f.status !== 'waived').reduce((s, f) => s + f.amount, 0)
  const feePending     = fees.filter(f => f.status === 'pending' || f.status === 'overdue').length
  const feeOverdue     = fees.filter(f => f.status === 'overdue').length
  const atRisk         = lowAtt.filter(s => s.percentage < 75).length
  const collectionRate = feeTotal > 0 ? Math.round((feeCollected / feeTotal) * 100) : 0

  const feePieData = [
    { name: 'Paid',    value: fees.filter(f => f.status === 'paid').length },
    { name: 'Pending', value: fees.filter(f => f.status === 'pending').length },
    { name: 'Overdue', value: fees.filter(f => f.status === 'overdue').length },
    { name: 'Waived',  value: fees.filter(f => f.status === 'waived').length },
  ].filter(d => d.value > 0)

  const attBarData = lowAtt.slice(0, 8).map(s => ({
    name: s.full_name.split(' ')[0],
    pct: s.percentage,
  }))

  const today = new Date().toLocaleDateString('en-NP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text3)', fontSize: 14 }}>
      Loading dashboard...
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Dashboard</h1>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>{today}</p>
      </div>

      {/* Top KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>

        <div className="card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Total Students</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'white', lineHeight: 1 }}>{totalStudents}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>enrolled this year</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Fee Collected</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>NPR {(feeCollected/1000).toFixed(1)}k</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{collectionRate}% of total billed</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="#22c55e" />
            </div>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--bg3)', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${collectionRate}%`, background: '#22c55e', transition: 'width 0.5s' }} />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Fee Overdue</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: feeOverdue > 0 ? '#ef4444' : 'var(--text)', lineHeight: 1 }}>{feeOverdue}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{feePending - feeOverdue} pending + {feeOverdue} overdue</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: feeOverdue > 0 ? '#fee2e2' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color={feeOverdue > 0 ? '#ef4444' : 'var(--text3)'} />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>At Risk</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: atRisk > 0 ? '#ef4444' : '#22c55e', lineHeight: 1 }}>{atRisk}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>below 75% attendance</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: atRisk > 0 ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color={atRisk > 0 ? '#ef4444' : '#22c55e'} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Fee pie */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Fee Status</p>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fees.length} total records</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={feePieData} cx="40%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {feePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
              <Tooltip formatter={(v, n) => {
                const amount = fees.filter(f => f.status === n.toLowerCase()).reduce((s, f) => s + f.amount, 0)
                return [`${v} records — NPR ${amount.toLocaleString()}`, n]
              }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Fee summary below chart */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#dcfce7', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>NPR {feeCollected.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#166534' }}>COLLECTED</div>
            </div>
            <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#fee2e2', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>NPR {(feeTotal - feeCollected).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#991b1b' }}>REMAINING</div>
            </div>
          </div>
        </div>

        {/* Attendance bar */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Attendance Overview</p>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fee2e2', color: '#ef4444', fontWeight: 500 }}>
              below 75%
            </span>
          </div>
          {attBarData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: 8 }}>
              <CheckCircle size={32} color="#22c55e" />
              <span style={{ fontSize: 13 }}>All students above 75% attendance</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Attendance']}
                  contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {attBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.pct < 75 ? '#ef4444' : entry.pct < 85 ? '#f59e0b' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent exams */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <BookOpen size={16} color="var(--primary)" />
            <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Recent Exams</p>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>{exams.length} total</span>
          </div>
          {exams.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No exams created yet</p>
          ) : exams.slice(0, 4).map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{e.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{e.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="badge badge-blue">{e.exam_type.replace('_', ' ')}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{e.full_marks}m</span>
              </div>
            </div>
          ))}
        </div>

        {/* At risk + quick stats */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Award size={16} color="#ef4444" />
            <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>At Risk Students</p>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ef4444' }}>below 75%</span>
          </div>
          {atRisk === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', gap: 8 }}>
              <CheckCircle size={28} color="#22c55e" />
              <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>All students on track!</span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>No students below 75% attendance</span>
            </div>
          ) : (
            lowAtt.filter(s => s.percentage < 75).slice(0, 5).map(s => (
              <div key={s.student_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.present} present · {s.absent} absent</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>{s.percentage}%</div>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--bg3)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${s.percentage}%`, background: '#ef4444' }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
