from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
import csv, io
from app.database import get_db
from app.models import Student, User
from app.schemas import StudentCreate, StudentUpdate, StudentResponse, PaginatedStudents
from app.auth import get_current_user, require_teacher, require_admin

router = APIRouter(prefix="/students", tags=["students"])


def _school_scope(user: User) -> int:
    """Get school_id from current user — enforces multi-tenant isolation."""
    if not user.school_id:
        raise HTTPException(status_code=403, detail="User has no school assigned")
    return user.school_id


@router.get("", response_model=PaginatedStudents)
async def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    class_id: Optional[int] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    school_id = _school_scope(user)

    # Build query — all filtering pushed to SQL (not Python!)
    query = select(Student).where(
        Student.school_id == school_id,
        Student.is_active == is_active,
    )
    if search:
        query = query.where(
            or_(
                Student.full_name.ilike(f"%{search}%"),
                Student.roll_no.ilike(f"%{search}%"),
            )
        )
    if class_id:
        query = query.where(Student.class_id == class_id)

    # Count total (for pagination)
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Apply pagination in SQL
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Student.full_name)
    result = await db.execute(query)
    students = result.scalars().all()

    return PaginatedStudents(
        total=total, page=page, page_size=page_size,
        items=[StudentResponse.model_validate(s) for s in students]
    )


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    school_id = _school_scope(user)
    result = await db.execute(
        select(Student).where(
            Student.id == student_id,
            Student.school_id == school_id
        )
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.post("", response_model=StudentResponse, status_code=201)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    school_id = _school_scope(user)

    # Check duplicate roll_no within this school
    exists = await db.execute(
        select(Student).where(
            Student.school_id == school_id,
            Student.roll_no == data.roll_no
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Roll no {data.roll_no} already exists")

    student = Student(school_id=school_id, **data.model_dump())
    db.add(student)
    await db.flush()
    return StudentResponse.model_validate(student)


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    school_id = _school_scope(user)
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.school_id == school_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(student, field, value)

    return StudentResponse.model_validate(student)


@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    school_id = _school_scope(user)
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.school_id == school_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    # Soft delete
    student.is_active = False


@router.post("/bulk-import", status_code=201)
async def bulk_import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Import students from a CSV file. Columns: roll_no,full_name,class_id,email,phone,parent_name,parent_phone"""
    school_id = _school_scope(user)

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    created, skipped = 0, 0
    for row in reader:
        roll_no = row.get("roll_no", "").strip()
        if not roll_no:
            skipped += 1
            continue

        # Skip duplicates
        exists = await db.execute(
            select(Student).where(
                Student.school_id == school_id,
                Student.roll_no == roll_no
            )
        )
        if exists.scalar_one_or_none():
            skipped += 1
            continue

        student = Student(
            school_id=school_id,
            roll_no=roll_no,
            full_name=row.get("full_name", "").strip(),
            class_id=int(row["class_id"]) if row.get("class_id") else None,
            email=row.get("email", "").strip() or None,
            phone=row.get("phone", "").strip() or None,
            parent_name=row.get("parent_name", "").strip() or None,
            parent_phone=row.get("parent_phone", "").strip() or None,
        )
        db.add(student)
        created += 1

    return {"created": created, "skipped": skipped}
