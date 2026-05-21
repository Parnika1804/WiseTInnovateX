from celery import Celery

REDIS_URL = "redis://localhost:6379/0"

celery_app = Celery(
    "eventflow",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"]
)

celery_app.conf.update(
    task_always_eager=False,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True
)