# EduFlow Nepal — School ERP Platform

![CI](https://github.com/YOUR_USERNAME/eduflow-nepal/actions/workflows/ci.yml/badge.svg)

A production-grade, multi-tenant school management platform built for Nepal's educational institutions. Schools sign up and manage students, attendance, exams, fees, and staff — with real-time notifications and an AI assistant.

**Live demo:** https://eduflow-nepal.vercel.app  
**API docs:** https://eduflow-nepal.onrender.com/docs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, async SQLAlchemy 2.0 |
| Database | PostgreSQL 15, Alembic migrations |
| Cache / Queue | Redis 7, Celery |
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI | Google Gemini API (real, not mocked) |
| Real-time | FastAPI WebSockets |
| DevOps | Docker, Docker Compose, GitHub Actions CI/CD |

---

## Features

### Core ERP modules
- **Multi-tenant** — each school's data is fully isolated by `school_id`
- **Students** — CRUD, bulk CSV import, pagination, search, soft delete
- **Attendance** — bulk marking, per-student history, low-attendance alerts (< 75%)
- **Exams & Marks** — exam scheduling, result entry, auto-grade, class rankings
- **Fees** — payment tracking, overdue management, receipt generation

### Technical highlights
- **Background jobs** — Celery + Redis: weekly fee reminders, monthly attendance reports
- **Real-time WebSocket** — live notifications pushed to admin dashboard
- **Redis caching** — dashboard stats cached (5-minute TTL), reduces DB load
- **Alembic migrations** — every schema change is versioned and reversible
- **GitHub Actions CI/CD** — pytest + flake8 on every push, Docker build verification
- **Refresh tokens** — proper JWT rotation, not just 24-hour expiry

### AI assistant
- Natural language queries: "Which students have attendance below 75%?"
- Risk analysis: automatically identifies at-risk students
- Real Gemini API integration — school-scoped, read-only SQL generation

---

## Architecture Decisions

### ADR 1: Multi-tenant via shared database with `school_id`
**Decision:** Single PostgreSQL database with `school_id` on every table.  
**Why:** Simpler than separate databases per school. All queries filtered at the ORM layer. Easy to add new schools without infrastructure changes.  
**Trade-off:** A missing `school_id` filter would leak data across schools. Mitigated by `_school_scope()` helper enforced in every router.

### ADR 2: Celery + Redis over FastAPI BackgroundTasks
**Decision:** Celery for background jobs instead of FastAPI's built-in `BackgroundTasks`.  
**Why:** FastAPI BackgroundTasks run in the same process — a crash kills the job. Celery runs in a separate worker, has retry logic, and supports scheduled tasks via celery-beat.  
**Trade-off:** Requires Redis as a broker, adding infrastructure complexity. Worth it for reliability.

### ADR 3: Access + refresh token pair
**Decision:** Short-lived access tokens (60 min) + long-lived refresh tokens (7 days).  
**Why:** Short access tokens limit the damage of a stolen token. Refresh tokens allow seamless re-authentication without re-login.  
**Trade-off:** More complex client-side token management. Standard practice for production apps.

### ADR 4: PostgreSQL over SQLite
**Decision:** PostgreSQL for production data.  
**Why:** Concurrent writes, proper ACID transactions, full-text search, better index types. Multi-tenant apps with many schools writing simultaneously would hit SQLite's file-level lock.  
**Trade-off:** Requires a running PostgreSQL instance. Mitigated by Docker Compose.

---

## Known Limitations & Future Work

- No SMS/email delivery yet (fee reminders log to console — integrate Sparrow SMS for Nepal)
- No file uploads for student documents
- No parent/student portal (admin and teacher only)
- WebSocket auth uses query param token — move to header in production
- Add rate limiting on auth endpoints

---

## Quick Start

### Option 1: Docker Compose (recommended)

```bash
git clone https://github.com/YOUR_USERNAME/eduflow-nepal.git
cd eduflow-nepal
cp .env.example .env
# Edit .env: add your GEMINI_API_KEY
docker-compose up --build
```

Services start at:
- Frontend: http://localhost:5173  
- Backend API: http://localhost:8000  
- API Docs (Swagger): http://localhost:8000/docs

Seed demo data:
```bash
docker-compose exec backend python seed.py
```

### Option 2: Local (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL to point to your local PostgreSQL
alembic upgrade head
python seed.py
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

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

Expected: all tests pass. CI runs automatically on every push.

---

## API Examples

**Login:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kms.edu.np","password":"Admin@1234"}'
```

**List students (paginated + search):**
```bash
curl "http://localhost:8000/students?page=1&page_size=10&search=Aarav" \
  -H "Authorization: Bearer <token>"
```

**Mark bulk attendance:**
```bash
curl -X POST http://localhost:8000/attendance/bulk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-05-19","records":[{"student_id":1,"status":"present"},{"student_id":2,"status":"absent"}]}'
```

**AI chat:**
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question":"Which students have attendance below 75%?"}'
```

**WebSocket (real-time notifications):**
```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/1?token=${accessToken}`);
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## Project Structure

```
eduflow-nepal/
├── .github/workflows/ci.yml     ← GitHub Actions CI/CD
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app + WebSocket
│   │   ├── models.py            ← SQLAlchemy ORM (all tables)
│   │   ├── schemas.py           ← Pydantic request/response
│   │   ├── auth.py              ← JWT + bcrypt + role guards
│   │   ├── websocket.py         ← WebSocket connection manager
│   │   ├── config.py            ← settings from .env
│   │   ├── database.py          ← async PostgreSQL engine
│   │   ├── routers/             ← one file per feature
│   │   ├── services/ai_service.py ← Gemini integration
│   │   └── tasks/               ← Celery background jobs
│   ├── alembic/                 ← database migrations
│   ├── tests/                   ← pytest test suite
│   └── seed.py                  ← demo data
├── frontend/src/                ← React + Tailwind
├── docker-compose.yml
└── .env.example
```
