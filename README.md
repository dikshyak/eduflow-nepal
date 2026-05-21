# EduFlow Nepal — School ERP Platform

![CI](https://github.com/dikshyak/eduflow-nepal/actions/workflows/ci.yml/badge.svg)

A production-grade, multi-tenant school management platform built for Nepal's educational institutions. Manage students, attendance, exams, fees, and staff — with real-time notifications and an AI assistant powered by Groq.

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Live Site** | https://eduflow.dikshyak.com.np |
| **Vercel** | https://eduflow-nepal.vercel.app |
| **Backend API** | https://eduflow-backend-bwnc.onrender.com |
| **API Docs (Swagger)** | https://eduflow-backend-bwnc.onrender.com/docs |
| **GitHub** | https://github.com/dikshyak/eduflow-nepal |

> Note: Backend is hosted on Render free tier. First request may take 50 seconds to wake up.

---

## 🖥️ Local URLs

| Service | URL | Notes |
|---------|-----|-------|
| Frontend (development) | http://localhost:5173 | Live reload — use during development |
| Frontend (Docker) | http://localhost:3000 | Production build via Docker |
| Backend API | http://localhost:8000 | FastAPI |
| API Docs (Swagger) | http://localhost:8000/docs | Interactive API documentation |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, async SQLAlchemy 2.0 |
| Database | PostgreSQL 15, Alembic migrations |
| Cache / Queue | Redis 7, Celery |
| Frontend | React 18, Vite 5, Tailwind CSS, Recharts |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI | Groq API — llama-3.3-70b (natural language to SQL, conversation memory) |
| Real-time | FastAPI WebSockets, 30s auto-refresh dashboard |
| DevOps | Docker, Docker Compose, GitHub Actions CI/CD |
| Hosting | Render (backend) + Vercel (frontend) + Cloudflare (domain) |

---

## ✨ Features

### Admin Role
- **Dashboard** — KPI cards (students, fee collected, overdue, at-risk), fee donut chart, attendance bar chart, at-risk students with progress bars. Auto-refreshes every 30 seconds.
- **Students** — pagination, search, add, delete. Click any student name to open slide-out profile drawer showing attendance summary, marks, and fee records.
- **Attendance** — two tabs: Mark Attendance (bulk mark all students present/absent/late) and Student History (monthly calendar showing green/red/orange days, navigate months, monthly stats)
- **Marks & Exams** — create exams, enter results per student, auto-grade (A+ to F), class rankings with gold/silver/bronze for top 3, edit marks inline
- **Fee Management** — grouped by student, shows billed/paid/balance, multiple fee types (tuition/exam/library/sports/transport), mark paid/overdue/waived
- **AI Chat** — ask in plain English, AI generates SQL and answers from real data, conversation memory, rejects non-school questions
- **Dark / Light mode** toggle
- **Role-based access** — admin sees everything including fees and AI

### Teacher Role
- **Dashboard** — My Classes (real class from DB), at-risk students, attendance overview, recent exams. No financial data.
- **Students** — view students, click to see profile drawer
- **Attendance** — mark attendance + view student history calendar
- **Marks** — view rankings, enter marks for students
- **AI Chat** — ask about students, attendance, marks

---

## 🔑 Demo Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| School Admin | admin@kms.edu.np | Admin@1234 | Full access |
| Teacher | teacher@kms.edu.np | Teacher@1234 | Limited access |

---

## 🏗️ Architecture Decisions

**Multi-tenant via shared DB** — Single PostgreSQL database with `school_id` on every table. All queries filtered at the ORM layer to prevent data leakage between schools.

**Celery + Redis over FastAPI BackgroundTasks** — Celery runs in a separate worker with retry logic and scheduled tasks (weekly fee reminders, monthly reports). BackgroundTasks die with the request process.

**Access + refresh token pair** — Short-lived access tokens (60 min) limit stolen token damage. Refresh tokens (7 days) allow seamless re-auth without re-login.

**Groq over Gemini** — Groq's free tier is faster and more reliable. The AI service generates school-scoped read-only SQL from natural language with conversation history for context.

**AI safety** — AI only runs SELECT queries (never INSERT/UPDATE/DELETE), always filters by school_id, rejects non-school questions, uses ILIKE for case-insensitive matching.

---

## 🚀 Quick Start

### Option 1 — Docker (recommended)
```bash
git clone https://github.com/dikshyak/eduflow-nepal.git
cd eduflow-nepal
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
docker-compose up -d
docker-compose exec backend python seed.py
```

Open http://localhost:3000

### Option 2 — Development mode
```bash
# Terminal 1 — Backend + DB
docker-compose up -d db redis backend celery_worker

# Terminal 2 — Frontend with live reload
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

24 tests covering auth, students, attendance, marks, and fees. CI runs automatically on every push via GitHub Actions.

---

## 📁 Project Structure

```
eduflow-nepal/
├── .github/
│   └── workflows/ci.yml         ← GitHub Actions CI/CD (runs pytest on every push)
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app + WebSocket endpoint
│   │   ├── models.py            ← SQLAlchemy ORM (schools, users, classes, students,
│   │   │                            attendance, exams, marks, fee_records)
│   │   ├── schemas.py           ← Pydantic request/response schemas
│   │   ├── auth.py              ← JWT tokens + bcrypt + role guards
│   │   ├── config.py            ← settings from .env
│   │   ├── database.py          ← async PostgreSQL engine (SQLite for tests)
│   │   ├── websocket.py         ← WebSocket connection manager
│   │   ├── routers/
│   │   │   ├── auth.py          ← login, register, refresh token
│   │   │   ├── students.py      ← CRUD, bulk import, pagination, search
│   │   │   ├── attendance.py    ← bulk mark, summaries, low-attendance alerts
│   │   │   ├── marks.py         ← exams, results, auto-grade, rankings
│   │   │   ├── fees.py          ← fee records, status updates
│   │   │   ├── ai_chat.py       ← natural language to SQL endpoint
│   │   │   └── classes.py       ← class management
│   │   ├── services/
│   │   │   └── ai_service.py    ← Groq integration (SQL generation + answer formatting)
│   │   └── tasks/
│   │       ├── celery_app.py    ← Celery configuration
│   │       ├── fee_tasks.py     ← weekly fee reminder emails
│   │       └── report_tasks.py  ← monthly attendance reports
│   ├── tests/
│   │   ├── conftest.py          ← pytest fixtures (test DB, auth tokens)
│   │   ├── test_auth.py         ← 12 auth + student tests
│   │   └── test_features.py     ← 12 attendance + marks + fees tests
│   ├── alembic/                 ← database migrations
│   ├── seed.py                  ← demo data (school + admin + teachers + 20 students)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx    ← KPI cards, charts, at-risk, auto-refresh
│       │   ├── Students.jsx     ← table + slide-out profile drawer
│       │   ├── Attendance.jsx   ← mark tab + history calendar tab
│       │   ├── Marks.jsx        ← exams, rankings, grade entry
│       │   ├── Fees.jsx         ← student fee summary, balance tracking
│       │   ├── AIChat.jsx       ← Groq chat with conversation memory
│       │   └── Login.jsx        ← JWT auth with demo credentials
│       ├── api/index.js         ← axios client with token refresh
│       ├── App.jsx              ← sidebar nav, role-based routing, dark/light mode
│       └── index.css            ← CSS variables, dark/light theme
├── docker-compose.yml           ← 5 services: frontend, backend, db, redis, celery
├── .env.example
└── README.md

```

---

## ⚠️ Known Limitations & Future Work

- No SMS/email delivery yet (fee reminders log to console — integrate Sparrow SMS for Nepal)
- No file uploads for student documents or photos
- No parent/student portal (admin and teacher roles only)
- Attendance locked after 24 hours (cannot edit past records)
- WebSocket auth uses query param token — move to header cookie in production
- Backend hosted on Render free tier — first request may be slow (50s spin-up time)