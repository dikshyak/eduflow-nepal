# EduFlow Nepal — School ERP Platform

![CI](https://github.com/dikshyak/eduflow-nepal/actions/workflows/ci.yml/badge.svg)

A production-grade, multi-tenant school management platform built for Nepal's educational institutions. Manage students, attendance, exams, fees, and staff — with real-time notifications and an AI assistant powered by Groq.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, async SQLAlchemy 2.0 |
| Database | PostgreSQL 15, Alembic migrations |
| Cache / Queue | Redis 7, Celery |
| Frontend | React 18, Vite 5, Tailwind CSS, Recharts |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI | Groq API — llama-3.3-70b (natural language to SQL) |
| Real-time | FastAPI WebSockets |
| DevOps | Docker, Docker Compose, GitHub Actions CI/CD |

---

## Features

- **Dashboard** — KPI cards, fee status chart, attendance overview, at-risk students
- **Students** — pagination, search, add, delete, slide-out profile drawer
- **Attendance** — bulk marking for all students, per-student history
- **Marks & Exams** — create exams, enter results, auto-grade (A+ to F), class rankings
- **Fee Management** — grouped by student, multiple fee types, balance tracking
- **AI Chat** — ask in plain English, AI generates SQL and answers from real data
- **Dark / Light mode** toggle
- **Multi-tenant** — each school's data fully isolated by school_id

---

## Architecture Decisions

**Multi-tenant via shared DB** — Single PostgreSQL database with `school_id` on every table. Simpler than per-school databases. All queries filtered at the ORM layer via `_school_scope()` helper.

**Celery + Redis over FastAPI BackgroundTasks** — Celery runs in a separate worker with retry logic and scheduled tasks (weekly fee reminders, monthly reports). BackgroundTasks die with the request.

**Access + refresh token pair** — Short-lived access tokens (60 min) limit stolen token damage. Refresh tokens (7 days) allow seamless re-auth without re-login.

**Groq over Gemini** — Groq's free tier is more generous and faster for inference. The AI service generates school-scoped read-only SQL from natural language.

---

## Quick Start

```bash
git clone https://github.com/dikshyak/eduflow-nepal.git
cd eduflow-nepal
cp .env.example .env
# Add your GROQ_API_KEY to .env
docker-compose up -d
docker-compose exec backend python seed.py
```

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| School Admin | admin@kms.edu.np | Admin@1234 |
| Teacher | teacher1@kms.edu.np | Teacher@1234 |

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

CI runs automatically on every push via GitHub Actions.

---

## Project Structure

```
eduflow-nepal/
├── .github/workflows/ci.yml     ← GitHub Actions CI/CD
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app + WebSocket
│   │   ├── models.py            ← SQLAlchemy ORM (8 tables)
│   │   ├── schemas.py           ← Pydantic schemas
│   │   ├── auth.py              ← JWT + bcrypt + role guards
│   │   ├── routers/             ← auth, students, attendance, marks, fees, ai
│   │   ├── services/ai_service.py ← Groq integration
│   │   └── tasks/               ← Celery background jobs
│   ├── tests/                   ← pytest test suite
│   └── seed.py                  ← demo data (school + 20 students)
├── frontend/src/
│   ├── pages/                   ← Dashboard, Students, Attendance, Marks, Fees, AIChat
│   └── api/index.js             ← axios client
├── docker-compose.yml
└── .env.example
```
