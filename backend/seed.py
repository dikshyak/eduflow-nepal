"""
Seed script — creates demo school, admin user, teachers, students,
attendance records, exams, marks, and fees.

Run: python seed.py
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings
from app.models import (
    Base, School, User, Class, Student,
    Attendance, Exam, Mark, FeeRecord,
    UserRole, AttendanceStatus, ExamType, FeeStatus
)
from app.auth import hash_password
from datetime import date, timedelta
import random


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        # ── School
        school = School(
            name="Kathmandu Model School",
            address="Putalisadak, Kathmandu",
            phone="01-4XXXXXX",
            email="kms@school.edu.np"
        )
        db.add(school)
        await db.flush()

        # ── Users
        admin = User(
            school_id=school.id,
            email="admin@kms.edu.np",
            hashed_password=hash_password("Admin@1234"),
            full_name="School Admin",
            role=UserRole.school_admin,
        )
        teacher1 = User(
            school_id=school.id,
            email="teacher1@kms.edu.np",
            hashed_password=hash_password("Teacher@1234"),
            full_name="Ram Prasad Sharma",
            role=UserRole.teacher,
        )
        teacher2 = User(
            school_id=school.id,
            email="teacher2@kms.edu.np",
            hashed_password=hash_password("Teacher@1234"),
            full_name="Sita Devi Thapa",
            role=UserRole.teacher,
        )
        db.add_all([admin, teacher1, teacher2])
        await db.flush()

        # ── Classes
        class_10a = Class(school_id=school.id, name="Grade 10", section="A", teacher_id=teacher1.id)
        class_10b = Class(school_id=school.id, name="Grade 10", section="B", teacher_id=teacher2.id)
        class_9a  = Class(school_id=school.id, name="Grade 9",  section="A", teacher_id=teacher1.id)
        db.add_all([class_10a, class_10b, class_9a])
        await db.flush()

        # ── Students
        student_data = [
            ("001", "Aarav Sharma",      class_10a.id, "9841XXXXXX", "Mr. Sharma",  "9841YYYYYY"),
            ("002", "Bina Thapa",        class_10a.id, "9851XXXXXX", "Mrs. Thapa",  "9851YYYYYY"),
            ("003", "Chetan Rai",        class_10a.id, "9861XXXXXX", "Mr. Rai",     "9861YYYYYY"),
            ("004", "Dipika Gurung",     class_10a.id, "9841AAXXXX", "Mr. Gurung",  "9841AAYYYY"),
            ("005", "Eshan Magar",       class_10a.id, "9851BBXXXX", "Mrs. Magar",  "9851BBYYYY"),
            ("006", "Fiona Shrestha",    class_10b.id, "9861CCXXXX", "Mr. Shrestha","9861CCYYYY"),
            ("007", "Gaurav Tamang",     class_10b.id, "9841DDXXXX", "Mrs. Tamang", "9841DDYYYY"),
            ("008", "Hira Karki",        class_10b.id, "9851EEXXXX", "Mr. Karki",   "9851EEYYYY"),
            ("009", "Isha Bhattarai",    class_9a.id,  "9861FFXXXX", "Mrs. Bhattarai","9861FFYYYY"),
            ("010", "Jeevan Adhikari",   class_9a.id,  "9841GGXXXX", "Mr. Adhikari","9841GGYYYY"),
        ]
        students = []
        for roll, name, cid, phone, pname, pphone in student_data:
            s = Student(
                school_id=school.id, class_id=cid, roll_no=roll,
                full_name=name, phone=phone,
                parent_name=pname, parent_phone=pphone
            )
            db.add(s)
            students.append(s)
        await db.flush()

        # ── Attendance (last 30 days)
        today = date.today()
        statuses = [AttendanceStatus.present] * 8 + [AttendanceStatus.absent, AttendanceStatus.late]
        for student in students:
            for i in range(30):
                d = today - timedelta(days=i)
                if d.weekday() < 5:  # skip weekends
                    db.add(Attendance(
                        school_id=school.id,
                        student_id=student.id,
                        date=d.isoformat(),
                        status=random.choice(statuses),
                        marked_by=teacher1.id,
                    ))

        # ── Exams
        math_exam = Exam(
            school_id=school.id, class_id=class_10a.id,
            name="First Terminal 2081", subject="Mathematics",
            exam_type=ExamType.mid_term, full_marks=100, pass_marks=40,
            date=(today - timedelta(days=10)).isoformat()
        )
        science_exam = Exam(
            school_id=school.id, class_id=class_10a.id,
            name="First Terminal 2081", subject="Science",
            exam_type=ExamType.mid_term, full_marks=100, pass_marks=40,
            date=(today - timedelta(days=9)).isoformat()
        )
        db.add_all([math_exam, science_exam])
        await db.flush()

        # ── Marks
        for student in students[:8]:  # grade 10 students
            for exam in [math_exam, science_exam]:
                marks_val = random.uniform(35, 98)
                pct = marks_val / exam.full_marks * 100
                grade = (
                    "A+" if pct >= 90 else "A" if pct >= 80 else
                    "B+" if pct >= 70 else "B" if pct >= 60 else
                    "C+" if pct >= 50 else "C" if pct >= 40 else "F"
                )
                db.add(Mark(
                    school_id=school.id,
                    student_id=student.id,
                    exam_id=exam.id,
                    marks=round(marks_val, 1),
                    grade=grade,
                ))

        # ── Fee records
        for student in students:
            # 2 months of fees — some paid, some pending
            for month_offset in [0, 1]:
                due = (today - timedelta(days=30 * month_offset)).replace(day=15)
                status = random.choice(
                    [FeeStatus.paid, FeeStatus.paid, FeeStatus.pending, FeeStatus.overdue]
                )
                db.add(FeeRecord(
                    school_id=school.id,
                    student_id=student.id,
                    amount=3500.0,
                    fee_type="tuition",
                    due_date=due.isoformat(),
                    paid_date=due.isoformat() if status == FeeStatus.paid else None,
                    status=status,
                ))

        await db.commit()

    print("\n✓ Seed complete!")
    print("─" * 40)
    print(f"School:  Kathmandu Model School")
    print(f"Admin:   admin@kms.edu.np  /  Admin@1234")
    print(f"Teacher: teacher1@kms.edu.np  /  Teacher@1234")
    print(f"Students: {len(students)} created across 3 classes")
    print(f"API docs: http://localhost:8000/docs")
    print("─" * 40)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
