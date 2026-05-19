from app.config import settings
import google.generativeai as genai
import json

genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel("gemini-1.5-flash")

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
notifications(id, school_id, title, message, type, is_read, created_at)
"""


async def question_to_sql(question: str, school_id: int) -> str:
    """Use Gemini to convert a natural language question to SQL."""
    prompt = f"""You are a PostgreSQL expert for a school management system.

Database schema:
{DB_SCHEMA}

Rules:
1. Return ONLY a valid PostgreSQL SELECT query — no explanation, no markdown.
2. ALWAYS filter by school_id = {school_id} for data isolation.
3. Use JOINs when student names are needed.
4. Use ILIKE for case-insensitive text search.
5. Limit results to 50 rows unless the user asks for all.
6. Never use DROP, DELETE, UPDATE, INSERT — read-only.

Question: {question}

SQL query:"""

    response = _model.generate_content(prompt)
    sql = response.text.strip()

    # Strip markdown code blocks if model adds them
    if sql.startswith("```"):
        sql = sql.split("```")[1]
        if sql.startswith("sql"):
            sql = sql[3:]
        sql = sql.strip()

    if not sql.upper().startswith("SELECT"):
        raise ValueError("Only SELECT queries are allowed")

    return sql


async def format_answer(question: str, rows: list, sql: str) -> str:
    """Use Gemini to turn raw SQL results into a friendly answer."""
    rows_preview = json.dumps(rows[:20], default=str)
    prompt = f"""A school administrator asked: "{question}"

The database returned {len(rows)} result(s):
{rows_preview}

Write a clear, friendly 2-3 sentence answer in plain English.
If there are 0 results, say so clearly.
Do not mention SQL or technical terms."""

    response = _model.generate_content(prompt)
    return response.text.strip()


async def analyze_student_risk(school_id: int, db) -> str:
    """AI analysis of at-risk students based on attendance + marks."""
    from sqlalchemy import text

    # Fetch summary data for AI analysis
    att_result = await db.execute(text(f"""
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
    low_att = [dict(r._mapping) for r in att_result]

    prompt = f"""You are an educational analyst. Based on this school data:

Students with lowest attendance (top 10 at-risk):
{json.dumps(low_att, default=str)}

Write a brief 3-4 sentence analysis identifying:
1. How many students are at serious risk (below 75% attendance)
2. What action the school should take
3. Any patterns you notice

Be specific with names and numbers."""

    response = _model.generate_content(prompt)
    return response.text.strip()
