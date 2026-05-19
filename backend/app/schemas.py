from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, AttendanceStatus, ExamType, FeeStatus


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    school_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_role: str
    school_id: Optional[int]


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── School ───────────────────────────────────────────────────────────────────

class SchoolCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: EmailStr


class SchoolResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Student ──────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    roll_no: str
    full_name: str
    class_id: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    class_id: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    is_active: Optional[bool] = None


class StudentResponse(BaseModel):
    id: int
    school_id: int
    roll_no: str
    full_name: str
    class_id: Optional[int]
    email: Optional[str]
    phone: Optional[str]
    parent_name: Optional[str]
    parent_phone: Optional[str]
    gender: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedStudents(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[StudentResponse]


# ─── Attendance ───────────────────────────────────────────────────────────────

class AttendanceCreate(BaseModel):
    student_id: int
    date: str
    status: AttendanceStatus
    note: Optional[str] = None


class AttendanceBulk(BaseModel):
    date: str
    records: List[AttendanceCreate]


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    date: str
    status: AttendanceStatus
    note: Optional[str]

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    student_id: int
    full_name: str
    total_days: int
    present: int
    absent: int
    late: int
    percentage: float


# ─── Exam & Marks ─────────────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    name: str
    subject: str
    class_id: Optional[int] = None
    exam_type: ExamType = ExamType.unit_test
    full_marks: float = 100.0
    pass_marks: float = 40.0
    date: Optional[str] = None


class ExamResponse(BaseModel):
    id: int
    name: str
    subject: str
    exam_type: ExamType
    full_marks: float
    pass_marks: float
    date: Optional[str]

    class Config:
        from_attributes = True


class MarkCreate(BaseModel):
    student_id: int
    exam_id: int
    marks: float
    remarks: Optional[str] = None


class MarkResponse(BaseModel):
    id: int
    student_id: int
    exam_id: int
    marks: float
    grade: Optional[str]
    remarks: Optional[str]

    class Config:
        from_attributes = True


# ─── Fees ─────────────────────────────────────────────────────────────────────

class FeeCreate(BaseModel):
    student_id: int
    amount: float
    fee_type: str = "tuition"
    due_date: Optional[str] = None
    note: Optional[str] = None


class FeeUpdate(BaseModel):
    status: FeeStatus
    paid_date: Optional[str] = None
    note: Optional[str] = None


class FeeResponse(BaseModel):
    id: int
    student_id: int
    amount: float
    fee_type: str
    due_date: Optional[str]
    paid_date: Optional[str]
    status: FeeStatus

    class Config:
        from_attributes = True


# ─── AI Chat ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    sql_used: Optional[str] = None
    row_count: int = 0


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_students: int
    total_teachers: int
    avg_attendance_pct: float
    fee_collected: float
    fee_pending: float
    recent_notifications: List[dict]
