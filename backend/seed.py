import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func
from app.config import settings
from app.models import *
from datetime import date, timedelta
import random

STUDENTS = [
    ('011','Kabita Poudel','9841KKXXXX','Mr. Poudel','9841KKYYYY'),
    ('012','Laxman Basnet','9851LLXXXX','Mrs. Basnet','9851LLYYYY'),
    ('013','Manisha Koirala','9861MMXXXX','Mr. Koirala','9861MMYYYY'),
    ('014','Nabin Karki','9841NNXXXX','Mrs. Karki','9841NNYYYY'),
    ('015','Ojasvi Shrestha','9851OOXXXX','Mr. Shrestha','9851OOYYYY'),
    ('016','Pratik Maharjan','9861PPXXXX','Mrs. Maharjan','9861PPYYYY'),
    ('017','Rima Lama','9841RRXXXX','Mr. Lama','9841RRYYYY'),
    ('018','Sagar Rai','9851SSXXXX','Mrs. Rai','9851SSYYYY'),
    ('019','Tina Gurung','9861TTXXXX','Mr. Gurung','9861TTYYYY'),
    ('020','Ujwal Thapa','9841UUXXXX','Mrs. Thapa','9841UUYYYY'),
    ('021','Vandana Sharma','9851VVXXXX','Mr. Sharma','9851VVYYYY'),
    ('022','Wishal Magar','9861WWXXXX','Mrs. Magar','9861WWYYYY'),
    ('023','Xina Tamang','9841XXXXXX','Mr. Tamang','9841XXYYYY'),
    ('024','Yubraj Pun','9851YYXXXX','Mrs. Pun','9851YYYYYY'),
    ('025','Zara Shrestha','9861ZZXXXX','Mr. Shrestha','9861ZZYYYY'),
    ('026','Anil Bajracharya','9841AAXXXX','Mrs. Bajracharya','9841AAYYYY'),
    ('027','Binita Dhakal','9851BBXXXX','Mr. Dhakal','9851BBYYYY'),
    ('028','Chirag Acharya','9861CCXXXX','Mrs. Acharya','9861CCYYYY'),
    ('029','Dipa Rai','9841DDXXXX','Mr. Rai','9841DDYYYY'),
    ('030','Emon Lama','9851EEXXXX','Mrs. Lama','9851EEYYYY'),
    ('031','Farida Miya','9861FFXXXX','Mr. Miya','9861FFYYYY'),
    ('032','Ganesh Parajuli','9841GGXXXX','Mrs. Parajuli','9841GGYYYY'),
    ('033','Hema Adhikari','9851HHXXXX','Mr. Adhikari','9851HHYYYY'),
    ('034','Ishan Khadka','9861IIXXXX','Mrs. Khadka','9861IIYYYY'),
    ('035','Jyoti Karmacharya','9841JJXXXX','Mr. Karmacharya','9841JJYYYY'),
    ('036','Kamal Regmi','9851KKXXXX','Mrs. Regmi','9851KKYYYY'),
    ('037','Lila Shrestha','9861LLXXXX','Mr. Shrestha','9861LLYYYY'),
    ('038','Mohan Bhandari','9841MMXXXX','Mrs. Bhandari','9841MMYYYY'),
    ('039','Nisha Nepal','9851NNXXXX','Mr. Nepal','9851NNYYYY'),
    ('040','Om Prakash Shah','9861OOXXXX','Mrs. Shah','9861OOYYYY'),
    ('041','Puja Maharjan','9841PPXXXX','Mr. Maharjan','9841PPYYYY'),
    ('042','Rohan Dahal','9851RRXXXX','Mrs. Dahal','9851RRYYYY'),
    ('043','Sunita Rai','9861SSXXXX','Mr. Rai','9861SSYYYY'),
    ('044','Tilak Ghimire','9841TTXXXX','Mrs. Ghimire','9841TTYYYY'),
    ('045','Uma Devi Sharma','9851UUXXXX','Mr. Sharma','9851UUYYYY'),
    ('046','Vikram Poudel','9861VVXXXX','Mrs. Poudel','9861VVYYYY'),
    ('047','Wangchuk Lama','9841WWXXXX','Mr. Lama','9841WWYYYY'),
    ('048','Yamuna Thapa','9851YYXXXX','Mrs. Thapa','9851YYYYYY'),
    ('049','Zenith Karki','9861ZZXXXX','Mr. Karki','9861ZZYYYY'),
    ('050','Arjun Basnet','9841ABXXXX','Mrs. Basnet','9841ABYYYY'),
]

async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    S = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with S() as db:
        school = (await db.execute(select(School))).scalars().first()
        cls = (await db.execute(select(Class))).scalars().first()
        today = date.today()
        statuses = [AttendanceStatus.present]*8 + [AttendanceStatus.absent, AttendanceStatus.late]
        added = 0
        for roll, name, phone, pname, pphone in STUDENTS:
            ex = (await db.execute(
                select(Student).where(Student.roll_no == roll, Student.school_id == school.id)
            )).scalar_one_or_none()
            if ex:
                continue
            s = Student(
                school_id=school.id, class_id=cls.id,
                roll_no=roll, full_name=name,
                phone=phone, parent_name=pname, parent_phone=pphone
            )
            db.add(s)
            await db.flush()
            for i in range(30):
                d = today - timedelta(days=i)
                if d.weekday() < 5:
                    db.add(Attendance(
                        school_id=school.id, student_id=s.id,
                        date=d.isoformat(), status=random.choice(statuses)
                    ))
            db.add(FeeRecord(
                school_id=school.id, student_id=s.id,
                amount=3500.0, fee_type='tuition',
                status=random.choice([FeeStatus.paid, FeeStatus.pending, FeeStatus.overdue])
            ))
            added += 1
        await db.commit()
        total = (await db.execute(select(func.count()).select_from(Student))).scalar()
        print(f'Added {added} students. Total: {total}')
    await engine.dispose()

asyncio.run(run())