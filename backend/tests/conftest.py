"""Shared test fixtures."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.database import Base, get_db
from app.models import School, User, UserRole
from app.auth import hash_password

# Use SQLite in-memory for tests — no PostgreSQL needed
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture
async def seeded_school_and_admin():
    """Create a test school and admin user."""
    async with TestSession() as db:
        school = School(name="Test School", email="test@school.com")
        db.add(school)
        await db.flush()

        admin = User(
            school_id=school.id,
            email="admin@test.com",
            hashed_password=hash_password("Admin@1234"),
            full_name="Test Admin",
            role=UserRole.school_admin,
        )
        db.add(admin)
        await db.commit()
        return {"school_id": school.id, "admin_email": "admin@test.com"}


@pytest_asyncio.fixture
async def admin_token(client, seeded_school_and_admin):
    """Log in as admin and return access token."""
    resp = await client.post("/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin@1234"
    })
    return resp.json()["access_token"]
