import { useState, useEffect } from 'react'
import { Plus, Trophy, RefreshCw } from 'lucide-react'
import { api } from '../api'

const GRADE_COLORS = {
  'A+': 'badge-green', 'A': 'badge-green',
  'B+': 'badge-blue',  'B': 'badge-blue',
  'C+': 'badge-gray',  'C': 'badge-gray',
  'F':  'badge-red',
}

export default function Marks() {
  const [exams,      setExams]      = useState([])
  const [students,   setStudents]   = useState([])
  const [rankings,   setRankings]   = useState([])
  const [selectedExam, setSelectedExam] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [examForm,   setExamForm]   = useState({ name: '', subject: '', full_marks: '100', pass_marks: '40', exam_type: 'unit_test' })
  const [markForm,   setMarkForm]   = useState({ student_id: '', marks: '' })
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [exRes, stRes] = await Promise.all([
        api.getExams(),
        api.getStudents({ page: 1, page_size: 100 })
      ])
      setExams(exRes.data)
      setStudents(stRes.data.items)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadRankings = async (examId) => {
    setSelectedExam(examId)
    try {
      const res = await api.getRankings(examId)
      setRankings(res.data)
    } catch {
      setError('Failed to load rankings')
    }
  }

  const handleCreateExam = async () => {
    if (!examForm.name || !examForm.subject) return setError('Name and subject required')
    setSaving(true)
    try {
      await api.addExam({
        name: examForm.name,
        subject: examForm.subject,
        full_marks: parseFloat(examForm.full_marks),
        pass_marks: parseFloat(examForm.pass_marks),
        exam_type: examForm.exam_type,
      })
      setExamForm({ name: '', subject: '', full_marks: '100', pass_marks: '40', exam_type: 'unit_test' })
      setShowForm(false)
      loadAll()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create exam')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMark = async () => {
    if (!markForm.student_id || !markForm.marks || !selectedExam)
      return setError('Select student and enter marks')
    setSaving(true)
    try {
      await api.addMark({
        student_id: parseInt(markForm.student_id),
        exam_id: selectedExam,
        marks: parseFloat(markForm.marks),
      })
      setMarkForm({ student_id: '', marks: '' })
      loadRankings(selectedExam)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add mark')
    } finally {
      setSaving(false)
    }
  }

  const selectedExamData = exams.find(e => e.id === selectedExam)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Marks & Exams</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            Create exams, enter results, view rankings
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAll} className="btn btn-ghost"><RefreshCw size={14} /></button>
          <button onClick={() => setShowForm(f => !f)} className="btn btn-primary">
            <Plus size={14} /> New Exam
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

      {/* Create exam form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Create New Exam</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Exam name *</label>
              <input className="input" placeholder="First Terminal 2081"
                value={examForm.name} onChange={e => setExamForm({ ...examForm, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Subject *</label>
              <input className="input" placeholder="Mathematics"
                value={examForm.subject} onChange={e => setExamForm({ ...examForm, subject: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Type</label>
              <select className="input" value={examForm.exam_type}
                onChange={e => setExamForm({ ...examForm, exam_type: e.target.value })}>
                <option value="unit_test">Unit Test</option>
                <option value="mid_term">Mid Term</option>
                <option value="final">Final</option>
                <option value="practical">Practical</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Full marks</label>
              <input className="input" type="number" value={examForm.full_marks}
                onChange={e => setExamForm({ ...examForm, full_marks: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Pass marks</label>
              <input className="input" type="number" value={examForm.pass_marks}
                onChange={e => setExamForm({ ...examForm, pass_marks: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreateExam} disabled={saving} className="btn btn-primary">
              {saving ? 'Creating...' : 'Create Exam'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        {/* Exam list */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Exams ({exams.length})
          </p>
          {loading ? (
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
          ) : exams.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No exams yet. Create one.
            </div>
          ) : (
            exams.map(exam => (
              <div key={exam.id} onClick={() => loadRankings(exam.id)}
                className="card"
                style={{
                  marginBottom: 8, cursor: 'pointer',
                  border: selectedExam === exam.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: selectedExam === exam.id ? 'var(--bg3)' : 'var(--bg2)',
                }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{exam.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{exam.subject}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span className="badge badge-blue">{exam.exam_type}</span>
                  <span className="badge badge-gray">{exam.full_marks} marks</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rankings */}
        <div>
          {!selectedExam ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <Trophy size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div>Select an exam to view rankings</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {selectedExamData?.name} — {selectedExamData?.subject}
                </p>
              </div>

              {/* Add mark */}
              <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Student</label>
                  <select className="input" value={markForm.student_id}
                    onChange={e => setMarkForm({ ...markForm, student_id: e.target.value })}>
                    <option value="">Select student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.roll_no} — {s.full_name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                    Marks (/{selectedExamData?.full_marks})
                  </label>
                  <input className="input" type="number" placeholder="88"
                    value={markForm.marks}
                    onChange={e => setMarkForm({ ...markForm, marks: e.target.value })} />
                </div>
                <button onClick={handleAddMark} disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Add Mark'}
                </button>
              </div>

              {/* Rankings table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {rankings.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    No marks entered yet
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Rank</th>
                        <th>Roll No</th>
                        <th>Name</th>
                        <th>Marks</th>
                        <th>Grade</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map(r => (
                        <tr key={r.student_id}>
                          <td>
                            <span style={{ fontWeight: 700, color: r.rank <= 3 ? '#f59e0b' : 'var(--text2)' }}>
                              #{r.rank}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--text2)' }}>{r.roll_no}</td>
                          <td style={{ fontWeight: 500 }}>{r.full_name}</td>
                          <td style={{ fontWeight: 600 }}>{r.marks}</td>
                          <td><span className={`badge ${GRADE_COLORS[r.grade] || 'badge-gray'}`}>{r.grade}</span></td>
                          <td>
                            <span className={`badge ${r.marks >= (selectedExamData?.pass_marks || 40) ? 'badge-green' : 'badge-red'}`}>
                              {r.marks >= (selectedExamData?.pass_marks || 40) ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}