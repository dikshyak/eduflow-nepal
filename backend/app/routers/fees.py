from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import FeeRecord, Student, User, FeeStatus
from app.schemas import FeeCreate, FeeUpdate, FeeResponse
from app.auth import require_teacher, require_admin

router = APIRouter(prefix="/fees", tags=["fees"])


@router.get("", response_model=list[FeeResponse])
async def get_fees(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    result = await db.execute(
        select(FeeRecord).where(FeeRecord.school_id == user.school_id)
        .order_by(FeeRecord.created_at.desc())
    )
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[FeeResponse])
async def get_student_fees(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    result = await db.execute(
        select(FeeRecord).where(
            FeeRecord.student_id == student_id,
            FeeRecord.school_id == user.school_id
        )
    )
    return result.scalars().all()


@router.post("", response_model=FeeResponse, status_code=201)
async def add_fee(
    data: FeeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    fee = FeeRecord(school_id=user.school_id, **data.model_dump())
    db.add(fee)
    await db.flush()
    return fee


@router.patch("/{fee_id}", response_model=FeeResponse)
async def update_fee(
    fee_id: int,
    data: FeeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    result = await db.execute(
        select(FeeRecord).where(
            FeeRecord.id == fee_id,
            FeeRecord.school_id == user.school_id
        )
    )
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(404, "Fee record not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(fee, field, value)

    await db.commit()
    await db.refresh(fee)
    return fee