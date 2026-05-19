from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import create_tables
from app.websocket import ws_manager
from app.routers import auth, students, attendance, marks, ai_chat, fees
from app.auth import get_current_user
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup and shutdown."""
    logger.info("Starting EduFlow Nepal API...")
    await create_tables()   # creates tables if not using Alembic yet
    logger.info("Database tables ready.")
    yield
    logger.info("Shutting down EduFlow Nepal API.")


app = FastAPI(
    title="EduFlow Nepal — School ERP API",
    description="""
## EduFlow Nepal

Multi-tenant school management platform for Nepal.

### Features
- **Multi-school** — complete data isolation per school
- **JWT Auth** — access + refresh tokens, role-based access
- **Students** — CRUD, bulk CSV import, pagination, search
- **Attendance** — bulk marking, summaries, low-attendance alerts
- **Marks** — exams, results, auto-grading, rankings
- **Fees** — payment tracking, overdue management
- **AI Chat** — ask questions in plain Nepali/English
- **Real-time** — WebSocket notifications to admin dashboard
- **Background Jobs** — Celery + Redis for reminders and reports

### Roles
| Role | Access |
|------|--------|
| super_admin | everything |
| school_admin | own school data |
| teacher | read + mark attendance/marks |
| student | own data only |
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(marks.router)
app.include_router(ai_chat.router)
app.include_router(fees.router)


# ─── WebSocket endpoint ───────────────────────────────────────────────────────

@app.websocket("/ws/{school_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    school_id: int,
    token: str = Query(...),
):
    """
    Real-time notification channel for a school's admin dashboard.
    Connect: ws://localhost:8000/ws/{school_id}?token=<access_token>
    """
    # Validate token before accepting
    from app.auth import decode_token
    from app.database import AsyncSessionLocal
    from app.models import User
    from sqlalchemy import select

    try:
        payload = decode_token(token)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.id == int(payload["sub"]))
            )
            user = result.scalar_one_or_none()
            if not user or user.school_id != school_id:
                await websocket.close(code=4001)
                return
    except Exception:
        await websocket.close(code=4001)
        return

    await ws_manager.connect(websocket, school_id)
    logger.info(f"WebSocket connected: school={school_id} user={user.email}")

    try:
        while True:
            # Keep connection alive — client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, school_id)
        logger.info(f"WebSocket disconnected: school={school_id}")


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "app": "EduFlow Nepal", "version": "1.0.0"}
