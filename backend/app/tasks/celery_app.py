from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "eduflow",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.fee_tasks", "app.tasks.report_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kathmandu",
    enable_utc=True,
)

# Scheduled tasks
celery_app.conf.beat_schedule = {
    # Every Monday 8 AM Nepal time — send fee reminders
    "weekly-fee-reminders": {
        "task": "app.tasks.fee_tasks.send_fee_reminders",
        "schedule": crontab(hour=8, minute=0, day_of_week=1),
    },
    # First day of every month — generate attendance reports
    "monthly-attendance-report": {
        "task": "app.tasks.report_tasks.generate_monthly_report",
        "schedule": crontab(hour=7, minute=0, day_of_month=1),
    },
}
