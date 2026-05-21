from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, School
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.auth import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token, decode_token
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Validate password strength
    validate_password_strength(data.password)

    # Check email not already used
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # SECURITY: always set role to teacher — never trust user input for role
    # Admins are created via seed script only
    new_user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        school_id=data.school_id,
        role=UserRole.teacher,
    )
    db.add(new_user)
    await db.flush()  # get the id before commit

    token_data = {"sub": str(new_user.id), "school_id": new_user.school_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_role=new_user.role.value,
        school_id=new_user.school_id,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token_data = {"sub": str(user.id), "school_id": user.school_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_role=user.role.value,
        school_id=user.school_id,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    token_data = {"sub": str(user.id), "school_id": user.school_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_role=user.role.value,
        school_id=user.school_id,
    )


@router.post("/seed-production", include_in_schema=False)
async def seed_production(db: AsyncSession = Depends(get_db)):
    """Temporary endpoint to seed production database. Delete after use."""
    from app.models import School, User, Class, UserRole
    from app.auth import hash_password

    existing = (await db.execute(select(School))).scalars().first()
    if existing:
        return {"message": "Already seeded"}

    school = School(
        name="Kathmandu Model School",
        address="Putalisadak, Kathmandu",
        phone="01-4XXXXXX",
        email="kms@school.edu.np"
    )
    db.add(school)
    await db.flush()

    admin = User(
        school_id=school.id,
        email="admin@kms.edu.np",
        hashed_password=hash_password("Admin@1234"),
        full_name="School Admin",
        role=UserRole.school_admin,
    )
    teacher = User(
        school_id=school.id,
        email="teacher@kms.edu.np",
        hashed_password=hash_password("Teacher@1234"),
        full_name="Ram Prasad Sharma",
        role=UserRole.teacher,
    )
    db.add_all([admin, teacher])
    await db.flush()

    cls = Class(school_id=school.id, name="Grade 10", section="A", teacher_id=teacher.id)
    db.add(cls)
    await db.flush()

    await db.commit()
    return {"message": "Seeded successfully", "school": school.name, "admin": admin.email}
