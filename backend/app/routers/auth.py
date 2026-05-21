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


@router.post("/seed-full", include_in_schema=False)
async def seed_full(db: AsyncSession = Depends(get_db)):
    from app.models import School, User, Class, UserRole, Student, Attendance, AttendanceStatus, Exam, ExamType, Mark, FeeRecord, FeeStatus
    from app.auth import hash_password
    from datetime import date, timedelta
    import random

    school = (await db.execute(select(School))).scalars().first()
    if not school:
        return {"error": "No school found. Run basic seed first."}

    cls = (await db.execute(select(Class))).scalars().first()
    teacher = (await db.execute(select(User).where(User.role == UserRole.teacher))).scalars().first()

    students_data = [
        ("001","Aarav Sharma","9841XXXXXX","Mr. Sharma","9841YYYYYY"),
        ("002","Bina Thapa","9851XXXXXX","Mrs. Thapa","9851YYYYYY"),
        ("003","Chetan Rai","9861XXXXXX","Mr. Rai","9861YYYYYY"),
        ("004","Dipika Gurung","9841AAXXXX","Mr. Gurung","9841AAYYYY"),
        ("005","Eshan Magar","9851BBXXXX","Mrs. Magar","9851BBYYYY"),
        ("006","Fiona Shrestha","9861CCXXXX","Mr. Shrestha","9861CCYYYY"),
        ("007","Gaurav Tamang","9841DDXXXX","Mrs. Tamang","9841DDYYYY"),
        ("008","Hira Karki","9851EEXXXX","Mr. Karki","9851EEYYYY"),
        ("009","Isha Bhattarai","9861FFXXXX","Mrs. Bhattarai","9861FFYYYY"),
        ("010","Jeevan Adhikari","9841GGXXXX","Mr. Adhikari","9841GGYYYY"),
        ("011","Kabita Poudel","9841KKXXXX","Mr. Poudel","9841KKYYYY"),
        ("012","Laxman Basnet","9851LLXXXX","Mrs. Basnet","9851LLYYYY"),
        ("013","Manisha Koirala","9861MMXXXX","Mr. Koirala","9861MMYYYY"),
        ("014","Nabin Karki","9841NNXXXX","Mrs. Karki","9841NNYYYY"),
        ("015","Ojasvi Shrestha","9851OOXXXX","Mr. Shrestha","9851OOYYYY"),
        ("016","Pratik Maharjan","9861PPXXXX","Mrs. Maharjan","9861PPYYYY"),
        ("017","Rima Lama","9841RRXXXX","Mr. Lama","9841RRYYYY"),
        ("018","Sagar Rai","9851SSXXXX","Mrs. Rai","9851SSYYYY"),
        ("019","Tina Gurung","9861TTXXXX","Mr. Gurung","9861TTYYYY"),
        ("020","Ujwal Thapa","9841UUXXXX","Mrs. Thapa","9841UUYYYY"),
    ]

    students = []
    for roll, name, phone, pname, pphone in students_data:
        existing = (await db.execute(select(Student).where(Student.roll_no == roll, Student.school_id == school.id))).scalar_one_or_none()
        if existing:
            students.append(existing)
            continue
        s = Student(school_id=school.id, class_id=cls.id, roll_no=roll, full_name=name, phone=phone, parent_name=pname, parent_phone=pphone)
        db.add(s)
        students.append(s)
    await db.flush()

    today = date.today()
    statuses = [AttendanceStatus.present]*8 + [AttendanceStatus.absent, AttendanceStatus.late]
    for s in students:
        for i in range(30):
            d = today - timedelta(days=i)
            if d.weekday() < 5:
                existing = (await db.execute(select(Attendance).where(Attendance.student_id == s.id, Attendance.date == d.isoformat()))).scalar_one_or_none()
                if not existing:
                    db.add(Attendance(school_id=school.id, student_id=s.id, date=d.isoformat(), status=random.choice(statuses), marked_by=teacher.id if teacher else None))

    math_exam = (await db.execute(select(Exam).where(Exam.subject == "Mathematics", Exam.school_id == school.id))).scalar_one_or_none()
    if not math_exam:
        math_exam = Exam(school_id=school.id, class_id=cls.id, name="First Terminal 2081", subject="Mathematics", exam_type=ExamType.mid_term, full_marks=100, pass_marks=40, date=(today-timedelta(days=10)).isoformat())
        db.add(math_exam)
    science_exam = (await db.execute(select(Exam).where(Exam.subject == "Science", Exam.school_id == school.id))).scalar_one_or_none()
    if not science_exam:
        science_exam = Exam(school_id=school.id, class_id=cls.id, name="First Terminal 2081", subject="Science", exam_type=ExamType.mid_term, full_marks=100, pass_marks=40, date=(today-timedelta(days=9)).isoformat())
        db.add(science_exam)
    await db.flush()

    for s in students[:10]:
        for exam in [math_exam, science_exam]:
            existing = (await db.execute(select(Mark).where(Mark.student_id == s.id, Mark.exam_id == exam.id))).scalar_one_or_none()
            if not existing:
                mv = round(random.uniform(35, 98), 1)
                pct = mv / exam.full_marks * 100
                grade = "A+" if pct>=90 else "A" if pct>=80 else "B+" if pct>=70 else "B" if pct>=60 else "C+" if pct>=50 else "C" if pct>=40 else "F"
                db.add(Mark(school_id=school.id, student_id=s.id, exam_id=exam.id, marks=mv, grade=grade))

    for s in students:
        for fee_type, amount in [('tuition',3500.0),('exam',1500.0),('library',500.0)]:
            existing = (await db.execute(select(FeeRecord).where(FeeRecord.student_id == s.id, FeeRecord.fee_type == fee_type))).scalar_one_or_none()
            if not existing:
                status = random.choice([FeeStatus.paid, FeeStatus.paid, FeeStatus.pending, FeeStatus.overdue])
                db.add(FeeRecord(school_id=school.id, student_id=s.id, amount=amount, fee_type=fee_type, due_date=(today-timedelta(days=15)).isoformat(), paid_date=today.isoformat() if status==FeeStatus.paid else None, status=status))

    await db.commit()
    return {"message": "Full seed complete", "students": len(students)}
