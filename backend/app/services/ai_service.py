from groq import Groq
from app.config import settings
import json

client = Groq(api_key=settings.GROQ_API_KEY)

DB_SCHEMA = """
PostgreSQL database for a school ERP system. Tables:

schools(id, name, email, is_active)
users(id, school_id, email, role, full_name, is_active)
classes(id, school_id, name, section)
students(id, school_id, class_id, roll_no, full_name, email, phone,
         parent_name, parent_phone, gender, is_active)
attendance(id, school_id, student_id, date TEXT 'YYYY-MM-DD',
           status: 'present'|'absent'|'late')
exams(id, school_id, class_id, name, subject, exam_type, full_marks, pass_marks, date)
marks(id, school_id, student_id, exam_id, marks, grade)
fee_records(id, school_id, student_id, amount, fee_type, due_date,
            paid_date, status: 'pending'|'paid'|'overdue'|'waived')
"""


async def question_to_sql(question: str, school_id: int) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""You are a PostgreSQL expert for a school management system.
Database schema:
{DB_SCHEMA}
Rules:
1. Return ONLY a valid PostgreSQL SELECT query — no explanation, no markdown, no backticks.
2. ALWAYS filter by school_id = {school_id} for data isolation.
3. Use JOINs when student names are needed.
4. Limit results to 50 rows unless asked for all.
5. Never use DROP, DELETE, UPDATE, INSERT — read-only."""
            },
            {
                "role": "user",
                "content": f"Convert to SQL: {question}"
            }
        ],
        temperature=0,
        max_tokens=500,
    )

    sql = response.choices[0].message.content.strip()
    if sql.startswith("```"):
        sql = sql.split("```")[1]
        if sql.startswith("sql"):
            sql = sql[3:]
        sql = sql.strip()

    if not sql.upper().startswith("SELECT"):
        raise ValueError("Only SELECT queries are allowed")

    return sql


async def format_answer(question: str, rows: list, sql: str) -> str:
    rows_preview = json.dumps(rows[:20], default=str)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful school assistant. Answer questions about school data clearly and concisely in 2-3 sentences."
            },
            {
                "role": "user",
                "content": f"""Question: {question}
Results ({len(rows)} rows): {rows_preview}
Write a clear, friendly answer in plain English. If 0 results, say so clearly."""
            }
        ],
        temperature=0.3,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


async def analyze_student_risk(school_id: int, db) -> str:
    from sqlalchemy import text
    result = await db.execute(text(f"""
        SELECT s.full_name, s.roll_no,
               COUNT(a.id) as total_days,
               SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id
        WHERE s.school_id = {school_id} AND s.is_active = true
        GROUP BY s.id, s.full_name, s.roll_no
        HAVING COUNT(a.id) > 0
        ORDER BY (SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)::float / COUNT(a.id)) ASC
        LIMIT 10
    """))
    low_att = [dict(r._mapping) for r in result]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": f"""Analyze these students with lowest attendance:
{json.dumps(low_att, default=str)}
Write a 3-4 sentence analysis identifying at-risk students and recommended actions."""
            }
        ],
        temperature=0.3,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()