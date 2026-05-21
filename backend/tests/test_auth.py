import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestAuth:

    async def test_register_success(self, client: AsyncClient, seeded_school_and_admin):
        resp = await client.post("/auth/register", json={
            "email": "newteacher@test.com",
            "password": "Teacher@1234",
            "full_name": "New Teacher",
            "school_id": seeded_school_and_admin["school_id"],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user_role"] == "teacher"

    async def test_register_weak_password(self, client: AsyncClient):
        resp = await client.post("/auth/register", json={
            "email": "user@test.com",
            "password": "weak",
            "full_name": "Test",
        })
        assert resp.status_code == 422

    async def test_register_duplicate_email(self, client: AsyncClient, seeded_school_and_admin):
        resp = await client.post("/auth/register", json={
            "email": "admin@test.com",
            "password": "Admin@1234",
            "full_name": "Duplicate",
        })
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"]

    async def test_login_success(self, client: AsyncClient, seeded_school_and_admin):
        resp = await client.post("/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin@1234",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password(self, client: AsyncClient, seeded_school_and_admin):
        resp = await client.post("/auth/login", json={
            "email": "admin@test.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    async def test_refresh_token(self, client: AsyncClient, seeded_school_and_admin):
        login = await client.post("/auth/login", json={
            "email": "admin@test.com", "password": "Admin@1234"
        })
        refresh_token = login.json()["refresh_token"]
        resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_access_token_rejected_as_refresh(self, client: AsyncClient, seeded_school_and_admin):
        login = await client.post("/auth/login", json={
            "email": "admin@test.com", "password": "Admin@1234"
        })
        access_token = login.json()["access_token"]
        resp = await client.post("/auth/refresh", json={"refresh_token": access_token})
        assert resp.status_code == 401


class TestStudents:

    async def test_create_student(self, client: AsyncClient, admin_token: str):
        resp = await client.post(
            "/students",
            json={"roll_no": "001", "full_name": "Aarav Sharma"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["full_name"] == "Aarav Sharma"

    async def test_duplicate_roll_no_rejected(self, client: AsyncClient, admin_token: str):
        data = {"roll_no": "001", "full_name": "First Student"}
        await client.post("/students", json=data,
                          headers={"Authorization": f"Bearer {admin_token}"})
        resp = await client.post("/students", json=data,
                                 headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"]

    async def test_list_students_paginated(self, client: AsyncClient, admin_token: str):
        for i in range(5):
            await client.post(
                "/students",
                json={"roll_no": f"00{i}", "full_name": f"Student {i}"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
        resp = await client.get(
            "/students?page=1&page_size=3",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 3

    async def test_search_student(self, client: AsyncClient, admin_token: str):
        await client.post("/students",
            json={"roll_no": "001", "full_name": "Aarav Sharma"},
            headers={"Authorization": f"Bearer {admin_token}"})
        await client.post("/students",
            json={"roll_no": "002", "full_name": "Bina Thapa"},
            headers={"Authorization": f"Bearer {admin_token}"})
        resp = await client.get(
            "/students?search=Aarav",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["full_name"] == "Aarav Sharma"

    async def test_unauthenticated_request_rejected(self, client: AsyncClient):
        resp = await client.get("/students")
        assert resp.status_code == 403