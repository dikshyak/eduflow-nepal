from app.tasks.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.fee_tasks.send_fee_reminders", bind=True, max_retries=3)
def send_fee_reminders(self):
    """
    Runs every Monday at 8 AM.
    Finds all overdue/pending fees and logs reminders.
    In production: integrate SMS (Sparrow SMS for Nepal) or email here.
    """
    try:
        from sqlalchemy import create_engine, text
        from app.config import settings

        # Use sync engine for Celery (Celery is not async)
        sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
        engine = create_engine(sync_url)

        with engine.connect() as conn:
            overdue = conn.execute(text("""
                SELECT f.id, s.full_name, s.parent_phone, s.parent_name,
                       f.amount, f.due_date, f.fee_type, sc.name as school_name
                FROM fee_records f
                JOIN students s ON f.student_id = s.id
                JOIN schools sc ON f.school_id = sc.id
                WHERE f.status IN ('pending', 'overdue')
                  AND f.due_date < CURRENT_DATE
                LIMIT 100
            """)).fetchall()

        reminder_count = 0
        for row in overdue:
            # TODO: replace with real SMS/email integration
            logger.info(
                f"[FEE REMINDER] {row.school_name} | "
                f"Student: {row.full_name} | "
                f"Parent: {row.parent_name} ({row.parent_phone}) | "
                f"Amount: NPR {row.amount} | Due: {row.due_date}"
            )
            reminder_count += 1

        logger.info(f"Fee reminders sent: {reminder_count}")
        return {"reminders_sent": reminder_count}

    except Exception as exc:
        logger.error(f"Fee reminder task failed: {exc}")
        raise self.retry(exc=exc, countdown=300)  # retry after 5 min
