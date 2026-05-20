import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, Clock, AlertCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api'

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    color: '#22c55e', bg: '#dcfce7', badge: 'badge-green', icon: CheckCircle },
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', badge: 'badge-gray',  icon: Clock },
  overdue: { label: 'Overdue', color: '#ef4444', bg: '#fee2e2', badge: 'badge-red',   icon: AlertCircle },
  waived:  { label: 'Waived',  color: '#94a3b8', bg: '#f1f5f9', badge: 'badge-gray',  icon: CheckCircle },
}

function getDisplayDate(f) {
  if (f.status === 'paid')    return { date: f.paid_date || f.due_date || '—', label: 'Paid on',  color: '#22c55e' }
  if (f.status === 'overdue') return { date: f.due_date || '—',                label: 'Was due',  color: '#ef4444' }
  if (f.status === 'pending') return { date: f.due_date || '—',                label: 'Due by',   color: '#f59e0b' }
  return { date: '—', label: '', color: 'var(--text2)' }
}

const PAGE_SIZE = 20

export default function Fees() {
  const [fees,      setFees]      = useState([])
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [editForm,  setEditForm]  = useState({})
  const [form,      setForm]      = useState({
    student_id: '', amount: '3500', fee_type: 'tuition', due_date: ''
  })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [feesRes, stRes] = await Promise.all([
        api.getFees(),
        api.getStudents({ page: 1, page_size: 100 })
      ])
      setFees(feesRes.data)
      setStudents(stRes.data.items)
    } catch {
      setError('Failed to load fees')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async (feeId) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await api.updateFee(feeId, { status: 'paid', paid_date: today })
      loadAll()
    } catch { setError('Failed to update fee') }
  }

  const handleUpdateStatus = async (feeId, status) => {
    try {
      await api.updateFee(feeId, { status })
      loadAll()
    } catch { setError('Failed to update fee') }
  }

  const handleSaveEdit = async () => {
    try {
      await api.updateFee(editId, { due_date: editForm.due_date || null })
      setEditId(null)
      loadAll()
    } catch { setError('Failed to save changes') }
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
      setForm({ student_id: '', amount: '3500', fee_type: 'tuition', due_date: '' })
      setShowForm(false)
      loadAll()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add fee')
    } finally { setSaving(false) }
  }

  const studentMap = {}
  students.forEach(s => studentMap[s.id] = s)

  const counts = {
    paid:    fees.filter(f => f.status === 'paid').length,
    pending: fees.filter(f => f.status === 'pending').length,
    overdue: fees.filter(f => f.status === 'overdue').length,
    waived:  fees.filter(f => f.status === 'waived').length,
  }

  const totalCollected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const totalPending   = fees.filter(f => f.status !== 'paid' && f.status !== 'waived').reduce((s, f) => s + f.amount, 0)

  const filtered = fees.filter(f => {
    const student = studentMap[f.student_id]
    if (!student) return true
    return student.full_name.toLowerCase().includes(search.toLowerCase()) ||
           student.roll_no.includes(search)
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Fees</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            Collected: NPR {totalCollected.toLocaleString()} &nbsp;|&nbsp; Pending: NPR {totalPending.toLocaleString()}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <cfg.icon size={18} color={cfg.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{counts[status]}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{cfg.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Add Fee Record</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Student *</label>
              <select className="input" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}>
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.roll_no} — {s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Amount (NPR) *</label>
              <input className="input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fee type</label>
              <select className="input" value={form.fee_type} onChange={e => setForm({ ...form, fee_type: e.target.value })}>
                <option value="tuition">Tuition</option>
                <option value="exam">Exam</option>
                <option value="library">Library</option>
                <option value="sports">Sports</option>
                <option value="transport">Transport</option>
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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{filtered.length} records</span>
          <input className="input" placeholder="Search student..." style={{ width: 200 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Roll No</th><th>Name</th><th>Fee Type</th>
                <th>Amount</th><th>Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(f => {
                const student = studentMap[f.student_id]
                const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.pending
                const isEditing = editId === f.id
                const dateInfo = getDisplayDate(f)
                return (
                  <tr key={f.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text2)' }}>{student?.roll_no || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{student?.full_name || '—'}</td>
                    <td><span className="badge badge-blue">{f.fee_type}</span></td>
                    <td style={{ fontWeight: 600 }}>NPR {f.amount.toLocaleString()}</td>
                    <td>
                      {isEditing ? (
                        <input className="input" type="date"
                          style={{ padding: '3px 6px', fontSize: 12, width: 140 }}
                          value={editForm.due_date || ''}
                          onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
                      ) : (
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dateInfo.label}</div>
                          <div style={{ fontSize: 12, color: dateInfo.color, fontWeight: 500 }}>{dateInfo.date}</div>
                        </div>
                      )}
                    </td>
                    <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={handleSaveEdit} className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }}>Save</button>
                          <button onClick={() => setEditId(null)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button onClick={() => { setEditId(f.id); setEditForm({ due_date: f.due_date || '' }) }}
                            className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>Edit</button>
                          {f.status !== 'paid' && f.status !== 'waived' && (
                            <button onClick={() => handleMarkPaid(f.id)} className="btn btn-ghost"
                              style={{ fontSize: 11, padding: '3px 8px', color: '#22c55e', borderColor: '#22c55e' }}>Paid</button>
                          )}
                          {f.status !== 'overdue' && f.status !== 'paid' && f.status !== 'waived' && (
                            <button onClick={() => handleUpdateStatus(f.id, 'overdue')} className="btn btn-ghost"
                              style={{ fontSize: 11, padding: '3px 8px', color: '#ef4444', borderColor: '#ef4444' }}>Overdue</button>
                          )}
                          {f.status !== 'waived' && f.status !== 'paid' && (
                            <button onClick={() => handleUpdateStatus(f.id, 'waived')} className="btn btn-ghost"
                              style={{ fontSize: 11, padding: '3px 8px', color: '#94a3b8', borderColor: '#94a3b8' }}>Waive</button>
                          )}
                          {(f.status === 'paid' || f.status === 'waived' || f.status === 'overdue') && (
                            <button onClick={() => handleUpdateStatus(f.id, 'pending')} className="btn btn-ghost"
                              style={{ fontSize: 11, padding: '3px 8px', color: '#f59e0b', borderColor: '#f59e0b' }}>Reset</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            Page {page} of {totalPages} — {filtered.length} total records
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn btn-ghost">
              <ChevronLeft size={14} /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className="btn"
                style={{
                  background: p === page ? 'var(--primary)' : 'transparent',
                  color: p === page ? 'white' : 'var(--text2)',
                  border: `1px solid ${p === page ? 'var(--primary)' : 'var(--border)'}`,
                  minWidth: 36,
                }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="btn btn-ghost">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
