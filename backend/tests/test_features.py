import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestAttendance:

    async def test_mark_bulk_attendance(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        # First create a student
        student = await client.post(
            "/students",
            json={"roll_no": "001", "full_name": "Test Student"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        # Mark attendance
        resp = await client.post(
            "/attendance/bulk",
            json={
                "date": "2026-05-21",
                "records": [
                    {"student_id": student_id, "date": "2026-05-21", "status": "present"}
                ]
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["created"] == 1

    async def test_mark_attendance_updates_existing(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        # Create student
        student = await client.post(
            "/students",
            json={"roll_no": "002", "full_name": "Test Student 2"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        # Mark present
        await client.post("/attendance/bulk", json={
            "date": "2026-05-21",
            "records": [{"student_id": student_id, "date": "2026-05-21", "status": "present"}]
        }, headers={"Authorization": f"Bearer {admin_token}"})

        # Mark absent (update)
        resp = await client.post("/attendance/bulk", json={
            "date": "2026-05-21",
            "records": [{"student_id": student_id, "date": "2026-05-21", "status": "absent"}]
        }, headers={"Authorization": f"Bearer {admin_token}"})

        assert resp.status_code == 201
        assert resp.json()["updated"] == 1

    async def test_get_student_attendance(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        student = await client.post(
            "/students",
            json={"roll_no": "003", "full_name": "Test Student 3"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        await client.post("/attendance/bulk", json={
            "date": "2026-05-21",
            "records": [{"student_id": student_id, "date": "2026-05-21", "status": "late"}]
        }, headers={"Authorization": f"Bearer {admin_token}"})

        resp = await client.get(
            f"/attendance/student/{student_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["status"] == "late"

    async def test_attendance_requires_auth(self, client: AsyncClient):
        resp = await client.post("/attendance/bulk", json={"date": "2026-05-21", "records": []})
        assert resp.status_code == 403


class TestMarks:

    async def test_create_exam(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        resp = await client.post(
            "/marks/exams",
            json={"name": "Final Exam", "subject": "Mathematics", "full_marks": 100, "pass_marks": 40},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["subject"] == "Mathematics"

    async def test_add_mark(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        # Create exam
        exam = await client.post(
            "/marks/exams",
            json={"name": "Unit Test", "subject": "Science", "full_marks": 100, "pass_marks": 40},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        exam_id = exam.json()["id"]

        # Create student
        student = await client.post(
            "/students",
            json={"roll_no": "010", "full_name": "Mark Student"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        # Add mark
        resp = await client.post(
            "/marks",
            json={"student_id": student_id, "exam_id": exam_id, "marks": 85.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["marks"] == 85.0
        assert resp.json()["grade"] == "A"

    async def test_marks_exceed_full_marks_rejected(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        exam = await client.post(
            "/marks/exams",
            json={"name": "Test", "subject": "English", "full_marks": 100, "pass_marks": 40},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        exam_id = exam.json()["id"]

        student = await client.post(
            "/students",
            json={"roll_no": "011", "full_name": "Over Student"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        resp = await client.post(
            "/marks",
            json={"student_id": student_id, "exam_id": exam_id, "marks": 110.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 400

    async def test_exam_rankings(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        exam = await client.post(
            "/marks/exams",
            json={"name": "Ranking Test", "subject": "History", "full_marks": 100, "pass_marks": 40},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        exam_id = exam.json()["id"]

        for i, (roll, name, score) in enumerate([("020", "Alice", 90), ("021", "Bob", 75), ("022", "Charlie", 85)]):
            student = await client.post(
                "/students",
                json={"roll_no": roll, "full_name": name},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            await client.post(
                "/marks",
                json={"student_id": student.json()["id"], "exam_id": exam_id, "marks": float(score)},
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        resp = await client.get(
            f"/marks/exam/{exam_id}/rankings",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        rankings = resp.json()
        assert rankings[0]["full_name"] == "Alice"
        assert rankings[0]["rank"] == 1
        assert rankings[1]["full_name"] == "Charlie"
        assert rankings[1]["rank"] == 2


class TestFees:

    async def test_create_fee(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        student = await client.post(
            "/students",
            json={"roll_no": "030", "full_name": "Fee Student"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        resp = await client.post(
            "/fees",
            json={"student_id": student_id, "amount": 3500.0, "fee_type": "tuition"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["amount"] == 3500.0
        assert resp.json()["status"] == "pending"

    async def test_update_fee_status(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        student = await client.post(
            "/students",
            json={"roll_no": "031", "full_name": "Pay Student"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        fee = await client.post(
            "/fees",
            json={"student_id": student_id, "amount": 3500.0, "fee_type": "tuition"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        fee_id = fee.json()["id"]

        resp = await client.patch(
            f"/fees/{fee_id}",
            json={"status": "paid", "paid_date": "2026-05-21"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "paid"

    async def test_get_student_fees(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        student = await client.post(
            "/students",
            json={"roll_no": "032", "full_name": "Fee Check Student"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        student_id = student.json()["id"]

        await client.post("/fees",
            json={"student_id": student_id, "amount": 3500.0, "fee_type": "tuition"},
            headers={"Authorization": f"Bearer {admin_token}"})
        await client.post("/fees",
            json={"student_id": student_id, "amount": 1500.0, "fee_type": "exam"},
            headers={"Authorization": f"Bearer {admin_token}"})

        resp = await client.get(
            f"/fees/student/{student_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_fee_not_found(self, client: AsyncClient, admin_token: str, seeded_school_and_admin):
        resp = await client.patch(
            "/fees/99999",
            json={"status": "paid"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404