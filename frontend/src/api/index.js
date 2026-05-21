import axios from 'axios'

const BASE = 'http://localhost:8000'

const client = axios.create({ baseURL: BASE })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const api = {
  login:   (data) => client.post('/auth/login', data),
  refresh: (data) => client.post('/auth/refresh', data),
  getStudents:   (params) => client.get('/students', { params }),
  getStudent:    (id)     => client.get(`/students/${id}`),
  addStudent:    (data)   => client.post('/students', data),
  updateStudent: (id, data) => client.put(`/students/${id}`, data),
  deleteStudent: (id)     => client.delete(`/students/${id}`),
  markAttendance:   (data) => client.post('/attendance/bulk', data),
  getAttendance:    (id)   => client.get(`/attendance/student/${id}`),
  getAttSummary:    (id)   => client.get(`/attendance/summary/${id}`),
  getLowAttendance: ()     => client.get('/attendance/low-attendance'),
  getExams:    ()       => client.get('/marks/exams'),
  addExam:     (data)   => client.post('/marks/exams', data),
  addMark:     (data)   => client.post('/marks', data),
  getMarks:    (id)     => client.get(`/marks/student/${id}`),
  getRankings: (id)     => client.get(`/marks/exam/${id}/rankings`),
  askAI:     (question, history = []) => client.post('/ai/chat', { question, history }),
  getClasses: () => client.get('/classes'),
getFees:   ()              => client.get('/fees'),
addFee:    (data)          => client.post('/fees', data),
updateFee: (id, data)      => client.patch(`/fees/${id}`, data),
getStudentFees: (id)       => client.get(`/fees/student/${id}`),
}