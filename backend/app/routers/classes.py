from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Class, User
from app.auth import require_teacher

router = APIRouter(prefix="/classes", tags=["classes"])


@router.get("")
async def get_classes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    result = await db.execute(
        select(Class).where(Class.school_id == user.school_id)
    )
    classes = result.scalars().all()
    return [{"id": c.id, "name": c.name, "section": c.section, "teacher_id": c.teacher_id} for c in classes]
