import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, UserCheck, RefreshCw } from 'lucide-react'
import { api } from '../api'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [adding,   setAdding]   = useState(false)
  const [form,     setForm]     = useState({ full_name: '', roll_no: '', grade: '', phone: '', parent_name: '', parent_phone: '' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.getStudents({ search, page: 1, page_size: 50 })
      setStudents(res.data.items)
    } catch {
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search])

  const handleAdd = async () => {
    if (!form.full_name || !form.roll_no || !form.grade)
      return setError('Name, roll no and grade are required')
    setAdding(true)
    setError('')
    try {
      await api.addStudent({ ...form, grade: parseInt(form.grade) })
      setForm({ full_name: '', roll_no: '', grade: '', phone: '', parent_name: '', parent_phone: '' })
      setShowForm(false)
      load()
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
      load()
    } catch {
      setError('Failed to delete')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Students</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            {students.length} students enrolled
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost">
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
                  <td style={{ fontWeight: 500 }}>{s.full_name}</td>
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
                      onMouseEnter={e => e.target.style.color = '#ef4444'}
                      onMouseLeave={e => e.target.style.color = 'var(--text3)'}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}