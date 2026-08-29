from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel, ConfigDict
from api.models import Document as DocumentModel
from api.deps import db_dependency, user_dependency, supabase_dependency
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
import pathlib
import os

from celery.result import AsyncResult
from rag_engine.celery_app import celery_app
from rag_engine.ingestion.celery_tasks import process_document_task

router = APIRouter(
    prefix='/ingestion',
    tags=['ingestion']
)


class DocumentResponse(BaseModel):
    document_id: UUID
    uploaded_by: Optional[UUID] = None
    file_name: str
    file_type: Optional[str] = None
    file_path: str
    total_page: Optional[int] = None
    total_chunk: Optional[int] = None
    private: bool = False
    task_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.get('/documents', response_model=List[DocumentResponse], status_code=status.HTTP_200_OK)
async def get_documents(
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Retrieve all document metadata (document_id, file_name, file_type, total_page, total_chunk, private, etc.).
    - Admin/Staff: Can view all documents in the system.
    - Regular Users: Can view all public documents and their own private documents.
    """
    user_id = UUID(str(current_user["id"]))
    user_role = current_user.get("role", "User")

    if user_role in ("Admin", "Staff"):
        documents = db.query(DocumentModel).order_by(DocumentModel.file_name.asc()).all()
    else:
        documents = (
            db.query(DocumentModel)
            .filter((DocumentModel.private == False) | (DocumentModel.uploaded_by == user_id))
            .order_by(DocumentModel.file_name.asc())
            .all()
        )

    return documents


@router.get('/documents/{document_id}', response_model=DocumentResponse, status_code=status.HTTP_200_OK)
async def get_document_by_id(
    document_id: UUID,
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Retrieve metadata for a specific document by its UUID.
    """
    user_id = UUID(str(current_user["id"]))
    user_role = current_user.get("role", "User")

    doc = db.query(DocumentModel).filter(DocumentModel.document_id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found",
        )

    if doc.private and user_role not in ("Admin", "Staff") and doc.uploaded_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this private document is restricted",
        )

    return doc


@router.get('/tasks/{task_id}', response_model=TaskStatusResponse, status_code=status.HTTP_200_OK)
async def get_task_status(
    task_id: str,
    current_user: user_dependency,
):
    """
    Retrieve the status and result of an asynchronous ingestion Celery task.
    """
    task_result = AsyncResult(task_id, app=celery_app)
    response_data: Dict[str, Any] = {
        "task_id": task_id,
        "status": task_result.status,
    }

    if task_result.ready():
        if task_result.successful():
            response_data["result"] = (
                task_result.result if isinstance(task_result.result, dict) else {"data": task_result.result}
            )
        else:
            response_data["error"] = str(task_result.result)
    elif task_result.info and isinstance(task_result.info, dict):
        response_data["progress"] = task_result.info

    return response_data


@router.delete('/documents/{document_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Delete a document and cascade-delete its vector chunks.
    - Admin/Staff: Can delete any document.
    - Regular Users: Can only delete their own uploaded documents.
    """
    user_id = UUID(str(current_user["id"]))
    user_role = current_user.get("role", "User")

    doc = db.query(DocumentModel).filter(DocumentModel.document_id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found",
        )

    if user_role not in ("Admin", "Staff") and doc.uploaded_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this document",
        )

    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return None


@router.post(
    '/upload',
    response_model=DocumentResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    db: db_dependency,
    current_user: user_dependency,
    supabase_client: supabase_dependency,
    file: UploadFile = File(...),
    is_private: bool = False,
):
    user_id = UUID(str(current_user["id"]))

    storage_dir = pathlib.Path('storage')
    storage_dir.mkdir(exist_ok=True)

    safe_name = pathlib.Path(file.filename).name
    file_path = storage_dir / safe_name
    bucket_name = 'electron-gate/pdfs'

    try:
        contents = await file.read()
        with open(file_path, 'wb') as fp:
            fp.write(contents)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"File write failed: {exc}")

    upload_key = f"{uuid4()}-{file.filename}"
    upload_result = supabase_client.storage.from_(bucket_name).upload(upload_key, contents)

    if not upload_result:
        raise HTTPException(status_code=500, detail="Supabase upload failed")

    doc = DocumentModel(
        document_id=uuid4(),
        uploaded_by=user_id,
        file_name=file.filename,
        file_type=file.content_type,
        file_path=str(file_path),
        total_page=0,
        total_chunk=0,
        private=is_private,
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        task = process_document_task.delay(str(doc.document_id), str(file_path))
        task_id = task.id
    except Exception as exc:
        db.delete(doc)
        db.commit()
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to queue background ingestion task: {exc}",
        )

    # total_page and total_chunk are omitted until background Celery worker completes
    return DocumentResponse(
        document_id=doc.document_id,
        uploaded_by=doc.uploaded_by,
        file_name=doc.file_name,
        file_type=doc.file_type,
        file_path=doc.file_path,
        total_page=None,
        total_chunk=None,
        private=doc.private,
        task_id=task_id,
    )
