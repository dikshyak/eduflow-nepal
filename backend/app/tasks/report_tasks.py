from app.tasks.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.report_tasks.generate_monthly_report", bind=True, max_retries=3)
def generate_monthly_report(self):
    """
    Runs on the 1st of every month.
    Generates attendance summary per school and logs it.
    In production: email report to school_admin or save as PDF.
    """
    try:
        from sqlalchemy import create_engine, text
        from app.config import settings
        from datetime import date

        sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
        engine = create_engine(sync_url)

        last_month = date.today().replace(day=1)
        month_str = last_month.strftime("%Y-%m")

        with engine.connect() as conn:
            stats = conn.execute(text(f"""
                SELECT sc.name as school_name,
                       COUNT(DISTINCT a.student_id) as students_tracked,
                       COUNT(a.id) as total_records,
                       SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
                       SUM(CASE WHEN a.status='absent'  THEN 1 ELSE 0 END) as absent_count
                FROM attendance a
                JOIN schools sc ON a.school_id = sc.id
                WHERE a.date LIKE '{month_str}%'
                GROUP BY sc.id, sc.name
            """)).fetchall()

        for row in stats:
            pct = round(row.present_count / row.total_records * 100, 1) if row.total_records else 0
            logger.info(
                f"[MONTHLY REPORT] {row.school_name} | "
                f"Month: {month_str} | "
                f"Students: {row.students_tracked} | "
                f"Attendance: {pct}% "
                f"({row.present_count}/{row.total_records})"
            )

        return {"month": month_str, "schools_reported": len(stats)}

    except Exception as exc:
        logger.error(f"Monthly report task failed: {exc}")
        raise self.retry(exc=exc, countdown=600)
