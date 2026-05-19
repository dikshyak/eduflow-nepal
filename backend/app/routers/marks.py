from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import Mark, Exam, Student, User
from app.schemas import MarkCreate, MarkResponse, ExamCreate, ExamResponse
from app.auth import require_teacher, require_admin

router = APIRouter(prefix="/marks", tags=["marks"])


def _calculate_grade(marks: float, full_marks: float) -> str:
    pct = (marks / full_marks) * 100
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B+"
    if pct >= 60: return "B"
    if pct >= 50: return "C+"
    if pct >= 40: return "C"
    return "F"


# ─── Exams ────────────────────────────────────────────────────────────────────

@router.post("/exams", response_model=ExamResponse, status_code=201)
async def create_exam(
    data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    exam = Exam(school_id=user.school_id, **data.model_dump())
    db.add(exam)
    await db.flush()
    return exam


@router.get("/exams", response_model=list[ExamResponse])
async def list_exams(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    result = await db.execute(
        select(Exam).where(Exam.school_id == user.school_id)
        .order_by(Exam.date.desc())
    )
    return result.scalars().all()


# ─── Marks entry ──────────────────────────────────────────────────────────────

@router.post("", response_model=MarkResponse, status_code=201)
async def add_mark(
    data: MarkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    # Get exam to know full_marks
    exam_res = await db.execute(
        select(Exam).where(Exam.id == data.exam_id, Exam.school_id == user.school_id)
    )
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise HTTPException(404, "Exam not found")

    if data.marks > exam.full_marks:
        raise HTTPException(400, f"Marks cannot exceed full marks ({exam.full_marks})")

    grade = _calculate_grade(data.marks, exam.full_marks)

    # Upsert — update if exists
    existing = await db.execute(
        select(Mark).where(
            Mark.student_id == data.student_id,
            Mark.exam_id == data.exam_id
        )
    )
    mark = existing.scalar_one_or_none()
    if mark:
        mark.marks = data.marks
        mark.grade = grade
        mark.remarks = data.remarks
    else:
        mark = Mark(
            school_id=user.school_id,
            student_id=data.student_id,
            exam_id=data.exam_id,
            marks=data.marks,
            grade=grade,
            remarks=data.remarks,
        )
        db.add(mark)

    await db.flush()
    return mark


@router.get("/student/{student_id}", response_model=list[MarkResponse])
async def get_student_marks(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    result = await db.execute(
        select(Mark).where(
            Mark.student_id == student_id,
            Mark.school_id == user.school_id
        ).order_by(Mark.created_at.desc())
    )
    return result.scalars().all()


@router.get("/exam/{exam_id}/rankings")
async def get_exam_rankings(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    """Return ranked list for an exam."""
    result = await db.execute(
        select(Mark, Student.full_name, Student.roll_no)
        .join(Student, Mark.student_id == Student.id)
        .where(Mark.exam_id == exam_id, Mark.school_id == user.school_id)
        .order_by(Mark.marks.desc())
    )
    rows = result.all()
    return [
        {
            "rank": i + 1,
            "student_id": r.Mark.student_id,
            "full_name": r.full_name,
            "roll_no": r.roll_no,
            "marks": r.Mark.marks,
            "grade": r.Mark.grade,
        }
        for i, r in enumerate(rows)
    ]
