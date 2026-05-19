from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models import Attendance, Student, User, AttendanceStatus
from app.schemas import AttendanceCreate, AttendanceBulk, AttendanceResponse, AttendanceSummary
from app.auth import require_teacher
from app.websocket import ws_manager

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _grade(pct: float) -> str:
    if pct >= 90: return "Excellent"
    if pct >= 75: return "Good"
    if pct >= 60: return "Average"
    return "Below minimum"


@router.post("/bulk", status_code=201)
async def mark_bulk_attendance(
    data: AttendanceBulk,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    """Mark attendance for an entire class in one request."""
    school_id = user.school_id
    results = {"created": 0, "updated": 0}

    for record in data.records:
        existing = await db.execute(
            select(Attendance).where(
                Attendance.student_id == record.student_id,
                Attendance.date == data.date,
            )
        )
        att = existing.scalar_one_or_none()
        if att:
            att.status = record.status
            att.note = record.note
            results["updated"] += 1
        else:
            att = Attendance(
                school_id=school_id,
                student_id=record.student_id,
                date=data.date,
                status=record.status,
                note=record.note,
                marked_by=user.id,
            )
            db.add(att)
            results["created"] += 1

    await db.flush()

    # Count absences and push WebSocket notification to admin
    absent_count = sum(
        1 for r in data.records if r.status == AttendanceStatus.absent
    )
    if absent_count > 0:
        await ws_manager.broadcast_to_school(
            school_id,
            {
                "type": "attendance_alert",
                "message": f"{absent_count} students absent on {data.date}",
                "date": data.date,
            }
        )

    return results


@router.get("/student/{student_id}", response_model=list[AttendanceResponse])
async def get_student_attendance(
    student_id: int,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    query = select(Attendance).where(
        Attendance.student_id == student_id,
        Attendance.school_id == user.school_id,
    )
    if from_date:
        query = query.where(Attendance.date >= from_date)
    if to_date:
        query = query.where(Attendance.date <= to_date)

    result = await db.execute(query.order_by(Attendance.date.desc()))
    return result.scalars().all()


@router.get("/summary/{student_id}", response_model=AttendanceSummary)
async def get_attendance_summary(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    # Get student name
    s_res = await db.execute(
        select(Student).where(
            Student.id == student_id,
            Student.school_id == user.school_id
        )
    )
    student = s_res.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found")

    # Aggregate in SQL — not Python
    counts = await db.execute(
        select(
            Attendance.status,
            func.count(Attendance.id).label("cnt")
        ).where(
            Attendance.student_id == student_id
        ).group_by(Attendance.status)
    )
    rows = counts.all()
    stat_map = {r.status: r.cnt for r in rows}

    present = stat_map.get(AttendanceStatus.present, 0)
    absent  = stat_map.get(AttendanceStatus.absent, 0)
    late    = stat_map.get(AttendanceStatus.late, 0)
    total   = present + absent + late
    pct     = round((present + late) / total * 100, 1) if total else 0.0

    return AttendanceSummary(
        student_id=student_id,
        full_name=student.full_name,
        total_days=total,
        present=present,
        absent=absent,
        late=late,
        percentage=pct,
    )


@router.get("/low-attendance", response_model=list[AttendanceSummary])
async def get_low_attendance_students(
    threshold: float = Query(75.0, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    """Return students with attendance below the given threshold percentage."""
    students_res = await db.execute(
        select(Student).where(
            Student.school_id == user.school_id,
            Student.is_active == True
        )
    )
    students = students_res.scalars().all()

    low = []
    for s in students:
        counts = await db.execute(
            select(Attendance.status, func.count().label("cnt"))
            .where(Attendance.student_id == s.id)
            .group_by(Attendance.status)
        )
        stat_map = {r.status: r.cnt for r in counts.all()}
        present = stat_map.get(AttendanceStatus.present, 0)
        late    = stat_map.get(AttendanceStatus.late, 0)
        absent  = stat_map.get(AttendanceStatus.absent, 0)
        total   = present + absent + late
        pct     = round((present + late) / total * 100, 1) if total else 0.0

        if pct < threshold:
            low.append(AttendanceSummary(
                student_id=s.id, full_name=s.full_name,
                total_days=total, present=present,
                absent=absent, late=late, percentage=pct
            ))

    return sorted(low, key=lambda x: x.percentage)
