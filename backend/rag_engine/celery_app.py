from celery import Celery

celery_app = Celery(
    "electron-gate-worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
    include=["rag_engine.ingestion.celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=3600,
    timezone="Asia/Ho_Chi_Minh",
    worker_prefetch_multiplier=1,
    enable_utc=False,
    task_default_queue="default",
    task_routes={
        "rag_engine.ingestion.celery_tasks.process_document_task": {"queue": "ingestion_queue"},
    },
)