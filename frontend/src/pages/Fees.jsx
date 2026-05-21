import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, Clock, AlertCircle, Plus, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { api } from '../api'

const FEE_TYPES = ['tuition', 'exam', 'library', 'sports', 'transport']

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    color: '#22c55e', bg: '#dcfce7', badge: 'badge-green', icon: CheckCircle },
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', badge: 'badge-gray',  icon: Clock },
  overdue: { label: 'Overdue', color: '#ef4444', bg: '#fee2e2', badge: 'badge-red',   icon: AlertCircle },
  waived:  { label: 'Waived',  color: '#94a3b8', bg: '#f1f5f9', badge: 'badge-gray',  icon: CheckCircle },
}

export default function Fees() {
  const [fees,      setFees]      = useState([])
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [expanded,    setExpanded]    = useState({})
  const [editingFee,  setEditingFee]  = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [form,      setForm]      = useState({
    student_id: '', studentSearch: '', amount: '3500', fee_type: 'tuition', due_date: ''
  })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [feesRes, stRes] = await Promise.all([
        api.getFees(),
        api.getStudents({ page: 1, page_size: 100 })
      ])
      const studentList = stRes.data.items
      const lookup = {}
      studentList.forEach(s => lookup[s.id] = s)
      const sorted = [...feesRes.data].sort((a, b) => {
        const ra = lookup[a.student_id]?.roll_no || '999'
        const rb = lookup[b.student_id]?.roll_no || '999'
        return ra.localeCompare(rb, undefined, { numeric: true })
      })
      setStudents(studentList)
      setFees(sorted)
    } catch {
      setError('Failed to load fees')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async (feeId) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const updated = await api.updateFee(feeId, { status: 'paid', paid_date: today })
      setFees(prev => prev.map(f => f.id === feeId ? updated.data : f))
    } catch { setError('Failed to update fee') }
  }

  const handleUpdateStatus = async (feeId, status) => {
    try {
      const updated = await api.updateFee(feeId, { status })
      setFees(prev => prev.map(f => f.id === feeId ? updated.data : f))
    } catch { setError('Failed to update fee') }
  }

  const handleAddFee = async () => {
    if (!form.student_id || !form.amount) return setError('Student and amount required')
    setSaving(true)
    setError('')
    try {
      await api.addFee({
        student_id: parseInt(form.student_id),
        amount: parseFloat(form.amount),
        fee_type: form.fee_type,
        due_date: form.due_date || null,
      })
      setForm({ student_id: '', studentSearch: '', amount: '3500', fee_type: 'tuition', due_date: '' })
      setShowForm(false)
      loadAll()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add fee')
    } finally { setSaving(false) }
  }

  const studentMap = {}
  students.forEach(s => studentMap[s.id] = s)

  const grouped = {}
  fees.forEach(f => {
    if (!grouped[f.student_id]) grouped[f.student_id] = []
    grouped[f.student_id].push(f)
  })

  const totalCollected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const totalPending   = fees.filter(f => f.status !== 'paid' && f.status !== 'waived').reduce((s, f) => s + f.amount, 0)
  const totalOwed      = fees.filter(f => f.status !== 'waived').reduce((s, f) => s + f.amount, 0)
  const collectionRate = totalOwed > 0 ? Math.round((totalCollected / totalOwed) * 100) : 0

  const statusCounts = { paid: 0, pending: 0, overdue: 0, waived: 0 }
  fees.forEach(f => { if (statusCounts[f.status] !== undefined) statusCounts[f.status]++ })

  const filteredStudents = students.filter(s => {
    if (!grouped[s.id]) return false
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || s.roll_no.includes(search)
    const matchesStatus = !statusFilter || (grouped[s.id] || []).some(f => f.status === statusFilter)
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Fee Management</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            Track and manage student fee payments
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAll} className="btn btn-ghost"><RefreshCw size={14} /></button>
          <button onClick={() => setShowForm(f => !f)} className="btn btn-primary">
            <Plus size={14} /> Add Fee
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Total Collected</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>NPR {totalCollected.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{collectionRate}% collection rate</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Remaining</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>NPR {totalPending.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>yet to collect</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Total Billed</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>NPR {totalOwed.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{fees.filter(f=>f.status!=='waived').length} active records</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Collection Rate</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: collectionRate >= 75 ? '#22c55e' : '#ef4444' }}>{collectionRate}%</div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${collectionRate}%`, background: collectionRate >= 75 ? '#22c55e' : '#ef4444', transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      {/* Add fee form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Add Fee Record</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Student *</label>
              <div style={{ position: 'relative' }}>
                <input className="input" placeholder="Search student..."
                  value={form.studentSearch}
                  onChange={e => setForm({ ...form, studentSearch: e.target.value, student_id: '' })} />
                {form.studentSearch && !form.student_id && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, zIndex: 50, maxHeight: 200, overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}>
                    {students.filter(s =>
                      s.full_name.toLowerCase().includes(form.studentSearch.toLowerCase()) ||
                      s.roll_no.includes(form.studentSearch)
                    ).map(s => (
                      <div key={s.id}
                        onClick={() => setForm({ ...form, student_id: String(s.id), studentSearch: `${s.roll_no} — ${s.full_name}` })}
                        style={{
                          padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                          color: 'var(--text)', borderBottom: '1px solid var(--border)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--text3)', marginRight: 8 }}>{s.roll_no}</span>
                        {s.full_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Amount (NPR) *</label>
              <input className="input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fee type</label>
              <select className="input" value={form.fee_type} onChange={e => setForm({ ...form, fee_type: e.target.value })}>
                {FEE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Due date</label>
              <input className="input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAddFee} disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Add Fee'}</button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { key: null,      label: 'All',     color: 'var(--text2)',  bg: 'var(--bg3)',  count: fees.length },
          { key: 'paid',    label: 'Paid',    color: '#16a34a',       bg: '#dcfce7',     count: statusCounts.paid },
          { key: 'pending', label: 'Pending', color: '#b45309',       bg: '#fef3c7',     count: statusCounts.pending },
          { key: 'overdue', label: 'Overdue', color: '#dc2626',       bg: '#fee2e2',     count: statusCounts.overdue },
          { key: 'waived',  label: 'Waived',  color: '#64748b',       bg: '#f1f5f9',     count: statusCounts.waived },
        ].map(({ key, label, color, bg, count }) => {
          const active = statusFilter === key
          return (
            <button key={String(key)} onClick={() => setStatusFilter(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 500,
                background: active ? bg : 'var(--bg3)',
                color: active ? color : 'var(--text2)',
                outline: active ? `2px solid ${color}` : 'none',
                outlineOffset: 1,
                transition: 'all 0.15s',
              }}>
              {label}
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: active ? color : 'var(--bg)',
                color: active ? '#fff' : 'var(--text3)',
                borderRadius: 20, padding: '1px 7px',
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Search by name or roll no..."
          style={{ maxWidth: 300 }}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Student rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>
        ) : filteredStudents.map(s => {
          const studentFees = grouped[s.id] || []
          const totalOwedS  = studentFees.filter(f => f.status !== 'waived').reduce((sum, f) => sum + f.amount, 0)
          const totalPaidS  = studentFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
          const balance     = totalOwedS - totalPaidS
          const isExpanded  = expanded[s.id]
          const hasOverdue  = studentFees.some(f => f.status === 'overdue')
          const allClear    = balance === 0

          return (
            <div key={s.id} className="card" style={{
              padding: 0, overflow: 'hidden',
              border: hasOverdue ? '1px solid #fca5a5' : allClear ? '1px solid #86efac' : '1px solid var(--border)',
            }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                {/* Status indicator */}
                <div style={{
                  width: 4, height: 40, borderRadius: 2, flexShrink: 0,
                  background: allClear ? '#22c55e' : hasOverdue ? '#ef4444' : '#f59e0b',
                }} />

                {/* Student info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Roll {s.roll_no}</div>
                </div>

                {/* Fee breakdown */}
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>BILLED</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>NPR {totalOwedS.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>PAID</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>NPR {totalPaidS.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>BALANCE</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: allClear ? '#22c55e' : hasOverdue ? '#ef4444' : '#f59e0b' }}>
                      {allClear ? '✓ Cleared' : `NPR ${balance.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                {/* Fee type badges */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
                  {studentFees.map(f => {
                    const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.pending
                    return (
                      <span key={f.id} style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 20,
                        background: cfg.bg, color: cfg.color,
                        fontWeight: 600, textTransform: 'capitalize',
                      }}>
                        {f.fee_type}
                      </span>
                    )
                  })}
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))}
                  className="btn btn-ghost"
                  style={{ flexShrink: 0, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span style={{ fontSize: 12 }}>Details</span>
                </button>
              </div>

              {/* Expanded detail rows */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 130px 100px 120px 1fr', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                    {['FEE TYPE','AMOUNT','DUE DATE','STATUS','PAID ON','ACTIONS'].map(h => (
                      <div key={h} style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {studentFees.map(f => {
                    const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.pending
                    const isEditingThis = editingFee?.id === f.id
                    return (
                      <div key={f.id} style={{
                        display: 'grid', gridTemplateColumns: '120px 100px 130px 100px 120px 1fr',
                        gap: 8, padding: '10px 16px', alignItems: 'center',
                        borderBottom: '1px solid var(--border)',
                        background: f.status === 'overdue' ? '#fff5f5' : f.status === 'paid' ? '#f0fdf4' : 'var(--bg2)',
                      }}>
                        {/* Fee type */}
                        <span className="badge badge-blue" style={{ width: 'fit-content', textTransform: 'capitalize' }}>{f.fee_type}</span>

                        {/* Amount */}
                        {isEditingThis ? (
                          <input className="input" type="number"
                            style={{ padding: '3px 6px', fontSize: 12 }}
                            value={editingFee.amount}
                            onChange={e => setEditingFee({ ...editingFee, amount: e.target.value })} />
                        ) : (
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>NPR {f.amount.toLocaleString()}</div>
                        )}

                        {/* Due date */}
                        {isEditingThis ? (
                          <input className="input" type="date"
                            style={{ padding: '3px 6px', fontSize: 12 }}
                            value={editingFee.due_date || ''}
                            onChange={e => setEditingFee({ ...editingFee, due_date: e.target.value })} />
                        ) : (
                          <div style={{ fontSize: 12, color: f.status === 'overdue' ? '#ef4444' : 'var(--text2)' }}>
                            {f.due_date || '—'}
                          </div>
                        )}

                        {/* Status */}
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>

                        {/* Paid on */}
                        <div style={{ fontSize: 12, color: '#22c55e' }}>
                          {f.paid_date || '—'}
                        </div>

                        {/* Actions */}
                        {isEditingThis ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={async () => {
                              await api.updateFee(f.id, {
                                amount: parseFloat(editingFee.amount),
                                due_date: editingFee.due_date || null,
                              })
                              setEditingFee(null)
                              loadAll()
                            }} className="btn btn-primary" style={{ fontSize: 11, padding: '2px 8px' }}>Save</button>
                            <button onClick={() => setEditingFee(null)} className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button onClick={() => setEditingFee({ id: f.id, amount: f.amount, due_date: f.due_date || '' })}
                              className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}>Edit</button>
                            {f.status !== 'paid' && f.status !== 'waived' && (
                              <button onClick={() => handleMarkPaid(f.id)} className="btn btn-ghost"
                                style={{ fontSize: 11, padding: '2px 8px', color: '#22c55e', borderColor: '#22c55e' }}>✓ Paid</button>
                            )}
                            {f.status !== 'overdue' && f.status !== 'paid' && f.status !== 'waived' && (
                              <button onClick={() => handleUpdateStatus(f.id, 'overdue')} className="btn btn-ghost"
                                style={{ fontSize: 11, padding: '2px 8px', color: '#ef4444', borderColor: '#ef4444' }}>Overdue</button>
                            )}
                            {f.status !== 'waived' && f.status !== 'paid' && (
                              <button onClick={() => handleUpdateStatus(f.id, 'waived')} className="btn btn-ghost"
                                style={{ fontSize: 11, padding: '2px 8px', color: '#94a3b8', borderColor: '#94a3b8' }}>Waive</button>
                            )}
                            {(f.status === 'paid' || f.status === 'waived' || f.status === 'overdue') && (
                              <button onClick={() => handleUpdateStatus(f.id, 'pending')} className="btn btn-ghost"
                                style={{ fontSize: 11, padding: '2px 8px', color: '#f59e0b', borderColor: '#f59e0b' }}>Reset</button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
