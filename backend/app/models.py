from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    ForeignKey, DateTime, Text, Enum, Index,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    super_admin = "super_admin"   # platform owner
    school_admin = "school_admin" # manages one school
    teacher = "teacher"
    student = "student"
    parent = "parent"

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    holiday = "holiday"

class ExamType(str, enum.Enum):
    unit_test = "unit_test"
    mid_term = "mid_term"
    final = "final"
    practical = "practical"

class FeeStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    overdue = "overdue"
    waived = "waived"


# ─── School ────────────────────────────────────────────────────────────────────

class School(Base):
    __tablename__ = "schools"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(200), nullable=False)
    address     = Column(Text)
    phone       = Column(String(20))
    email       = Column(String(100), unique=True, index=True)
    logo_url    = Column(String(500))
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    users       = relationship("User",       back_populates="school")
    students    = relationship("Student",    back_populates="school")
    classes     = relationship("Class",      back_populates="school")
    exams       = relationship("Exam",       back_populates="school")
    fees        = relationship("FeeRecord",  back_populates="school")


# ─── User (Auth) ───────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    school_id       = Column(Integer, ForeignKey("schools.id"), nullable=True, index=True)
    email           = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(150))
    role            = Column(Enum(UserRole), default=UserRole.teacher, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    school          = relationship("School", back_populates="users")

    __table_args__ = (
        Index("idx_user_school_role", "school_id", "role"),
    )


# ─── Class / Section ──────────────────────────────────────────────────────────

class Class(Base):
    __tablename__ = "classes"

    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    name        = Column(String(50), nullable=False)   # e.g. "Grade 10"
    section     = Column(String(10), default="A")      # e.g. "A", "B"
    teacher_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    school      = relationship("School", back_populates="classes")
    students    = relationship("Student", back_populates="class_ref")

    __table_args__ = (
        UniqueConstraint("school_id", "name", "section", name="uq_class_school"),
        Index("idx_class_school", "school_id"),
    )


# ─── Student ──────────────────────────────────────────────────────────────────

class Student(Base):
    __tablename__ = "students"

    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    class_id    = Column(Integer, ForeignKey("classes.id"), nullable=True, index=True)
    roll_no     = Column(String(20), nullable=False)
    full_name   = Column(String(150), nullable=False)
    email       = Column(String(100))
    phone       = Column(String(20))
    parent_name = Column(String(150))
    parent_phone= Column(String(20))
    address     = Column(Text)
    gender      = Column(String(10))
    dob         = Column(String(20))
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    school      = relationship("School",     back_populates="students")
    class_ref   = relationship("Class",      back_populates="students")
    attendances = relationship("Attendance", back_populates="student")
    marks       = relationship("Mark",       back_populates="student")
    fee_records = relationship("FeeRecord",  back_populates="student")

    __table_args__ = (
        UniqueConstraint("school_id", "roll_no", name="uq_student_roll"),
        Index("idx_student_school_class", "school_id", "class_id"),
        Index("idx_student_name", "school_id", "full_name"),
    )


# ─── Attendance ───────────────────────────────────────────────────────────────

class Attendance(Base):
    __tablename__ = "attendance"

    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    student_id  = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    date        = Column(String(10), nullable=False)   # "YYYY-MM-DD"
    status      = Column(Enum(AttendanceStatus), nullable=False)
    note        = Column(String(200))
    marked_by   = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    student     = relationship("Student", back_populates="attendances")

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
        Index("idx_att_school_date", "school_id", "date"),
        Index("idx_att_student_date", "student_id", "date"),
    )


# ─── Exam ────────────────────────────────────────────────────────────────────

class Exam(Base):
    __tablename__ = "exams"

    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    class_id    = Column(Integer, ForeignKey("classes.id"), nullable=True)
    name        = Column(String(100), nullable=False)
    exam_type   = Column(Enum(ExamType), default=ExamType.unit_test)
    subject     = Column(String(100), nullable=False)
    full_marks  = Column(Float, default=100.0)
    pass_marks  = Column(Float, default=40.0)
    date        = Column(String(10))
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    school      = relationship("School", back_populates="exams")
    marks       = relationship("Mark",   back_populates="exam")

    __table_args__ = (
        Index("idx_exam_school", "school_id", "class_id"),
    )


# ─── Mark ────────────────────────────────────────────────────────────────────

class Mark(Base):
    __tablename__ = "marks"

    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    student_id  = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    exam_id     = Column(Integer, ForeignKey("exams.id"),    nullable=False, index=True)
    marks       = Column(Float, nullable=False)
    grade       = Column(String(5))    # auto-calculated
    remarks     = Column(String(200))
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    student     = relationship("Student", back_populates="marks")
    exam        = relationship("Exam",    back_populates="marks")

    __table_args__ = (
        UniqueConstraint("student_id", "exam_id", name="uq_mark_student_exam"),
        Index("idx_mark_school_exam", "school_id", "exam_id"),
    )


# ─── Fee Record ───────────────────────────────────────────────────────────────

class FeeRecord(Base):
    __tablename__ = "fee_records"

    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    student_id  = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    amount      = Column(Float, nullable=False)
    fee_type    = Column(String(100), default="tuition")
    due_date    = Column(String(10))
    paid_date   = Column(String(10))
    status      = Column(Enum(FeeStatus), default=FeeStatus.pending)
    note        = Column(String(200))
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    school      = relationship("School",  back_populates="fees")
    student     = relationship("Student", back_populates="fee_records")

    __table_args__ = (
        Index("idx_fee_school_status", "school_id", "status"),
        Index("idx_fee_student",       "student_id"),
    )


# ─── Notification ─────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    title       = Column(String(200), nullable=False)
    message     = Column(Text, nullable=False)
    type        = Column(String(50), default="info")   # info, warning, alert
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_notif_school_read", "school_id", "is_read"),
    )
