"""
Celery Configuration for Background Tasks
"""
from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    "document_processor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Ho_Chi_Minh',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
)

# IMPORTANT: Import tasks AFTER celery_app is created
# This ensures tasks are registered with this celery instance
if __name__ != '__main__':
    # Import when loaded by worker
    from app.tasks.document_tasks import process_document_task  # noqa: F401
