import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, UserCheck, RefreshCw, ChevronLeft, ChevronRight, X, Calendar, BarChart2, DollarSign } from 'lucide-react'
import { api } from '../api'


const PAGE_SIZE = 10

export default function Students() {
  const [students, setStudents] = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [adding,   setAdding]   = useState(false)
  const [form,     setForm]     = useState({ full_name: '', roll_no: '', grade: '', phone: '', parent_name: '', parent_phone: '' })
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentDetail,   setStudentDetail]   = useState({ att: null, marks: [], fees: [] })
  const [detailLoading,   setDetailLoading]   = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.getStudents({ search, page: p, page_size: PAGE_SIZE })
      setStudents(res.data.items)
      setTotal(res.data.total)
    } catch {
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    load(1)
  }, [search])

  useEffect(() => {
    load(page)
  }, [page])

  const handleAdd = async () => {
    if (!form.full_name || !form.roll_no || !form.grade)
      return setError('Name, roll no and grade are required')
    setAdding(true)
    setError('')
    try {
      await api.addStudent({ ...form, grade: parseInt(form.grade) })
      setForm({ full_name: '', roll_no: '', grade: '', phone: '', parent_name: '', parent_phone: '' })
      setShowForm(false)
      load(1)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add student')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return
    try {
      await api.deleteStudent(id)
      load(page)
    } catch {
      setError('Failed to delete')
    }
  }

  const openStudent = async (student) => {
    setSelectedStudent(student)
    setDetailLoading(true)
    try {
      const [attRes, marksRes, feesRes, examsRes] = await Promise.all([
        api.getAttSummary(student.id),
        api.getMarks(student.id),
        api.getStudentFees(student.id),
        api.getExams(),
      ])
      setStudentDetail({
        att: attRes.data,
        marks: marksRes.data,
        fees: feesRes.data,
        exams: examsRes.data,
      })
    } catch {
      setStudentDetail({ att: null, marks: [], fees: [], exams: [] })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Students</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            {total} students enrolled
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => load(page)} className="btn btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(f => !f)} className="btn btn-primary">
            <Plus size={14} /> Add Student
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5',
          color: '#991b1b', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>New Student</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Full name *</label>
              <input className="input" placeholder="Aarav Sharma"
                value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Roll no *</label>
              <input className="input" placeholder="051"
                value={form.roll_no} onChange={e => setForm({ ...form, roll_no: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Grade *</label>
              <input className="input" type="number" placeholder="10"
                value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Phone</label>
              <input className="input" placeholder="98XXXXXXXX"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Parent name</label>
              <input className="input" placeholder="Parent name"
                value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Parent phone</label>
              <input className="input" placeholder="98XXXXXXXX"
                value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={adding} className="btn btn-primary">
              {adding ? 'Saving...' : 'Save Student'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input className="input" placeholder="Search name or roll no..."
          style={{ paddingLeft: 32 }}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : students.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            <UserCheck size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            No students found
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Grade</th>
                <th>Phone</th>
                <th>Parent</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text2)' }}>{s.roll_no}</td>
                  <td style={{ fontWeight: 500, color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => openStudent(s)}>
                    {s.full_name}
                  </td>
                  <td><span className="badge badge-blue">Grade {s.grade}</span></td>
                  <td style={{ color: 'var(--text2)' }}>{s.phone || '—'}</td>
                  <td style={{ color: 'var(--text2)' }}>{s.parent_name || '—'}</td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(s.id, s.full_name)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            Page {page} of {totalPages} — {total} students
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="btn"
                style={{
                  background: p === page ? 'var(--primary)' : 'transparent',
                  color: p === page ? 'white' : 'var(--text2)',
                  border: `1px solid ${p === page ? 'var(--primary)' : 'var(--border)'}`,
                  minWidth: 36,
                }}>
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-ghost"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Student drawer */}
      {selectedStudent && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 420, background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          zIndex: 100, overflowY: 'auto', padding: '1.5rem',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{selectedStudent.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                Roll {selectedStudent.roll_no} · Grade {selectedStudent.grade}
              </div>
            </div>
            <button onClick={() => setSelectedStudent(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Contact */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Contact</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
              <div>Phone: {selectedStudent.phone || '—'}</div>
              <div>Parent: {selectedStudent.parent_name || '—'}</div>
              <div>Parent phone: {selectedStudent.parent_phone || '—'}</div>
            </div>
          </div>

          {detailLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 20 }}>Loading...</div>
          ) : (
            <>
              {/* Attendance summary */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Calendar size={14} color="var(--text3)" />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Attendance</span>
                </div>
                {studentDetail.att ? (
                  <div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                      {[
                        { label: 'Present', value: studentDetail.att.present, color: '#22c55e' },
                        { label: 'Absent',  value: studentDetail.att.absent,  color: '#ef4444' },
                        { label: 'Late',    value: studentDetail.att.late,     color: '#f59e0b' },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
                        </div>
                      ))}
                      <div style={{ textAlign: 'center', marginLeft: 'auto' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: studentDetail.att.percentage < 75 ? '#ef4444' : '#22c55e' }}>
                          {studentDetail.att.percentage}%
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Overall</div>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${studentDetail.att.percentage}%`,
                        background: studentDetail.att.percentage < 75 ? '#ef4444' : '#22c55e',
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No attendance records</div>
                )}
              </div>

              {/* Marks */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <BarChart2 size={14} color="var(--text3)" />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Marks</span>
                </div>
                {studentDetail.marks.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No marks recorded</div>
                ) : (
                  studentDetail.marks.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>
                        {studentDetail.exams?.find(e => e.id === m.exam_id)?.subject || `Exam #${m.exam_id}`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {studentDetail.exams?.find(e => e.id === m.exam_id)?.name || ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.marks}</span>
                        <span className={`badge ${m.grade === 'F' ? 'badge-red' : 'badge-green'}`}>{m.grade}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Fees */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <DollarSign size={14} color="var(--text3)" />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Fees</span>
                </div>
                {studentDetail.fees.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No fee records</div>
                ) : (
                  studentDetail.fees.map(f => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>NPR {f.amount.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.fee_type} · {f.due_date || '—'}</div>
                      </div>
                      <span className={`badge ${f.status === 'paid' ? 'badge-green' : f.status === 'overdue' ? 'badge-red' : 'badge-gray'}`}>
                        {f.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}