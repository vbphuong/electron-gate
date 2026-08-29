#IF EMPTY DOC, RETURN USER ERROR
from uuid import UUID, uuid4
from celery import chord, group
from celery.utils.log import get_task_logger

from rag_engine.celery_app import celery_app
from rag_engine.ingestion.document_loader import partition_document
from rag_engine.ingestion.chunker_and_summarizer import (
    create_chunks_by_title,
    serialize_chunk,
    process_chunk_dict,
)
from api.deps import get_db, get_llm, get_embedding
from api.models import Document as DocumentModel, Chunk as ChunkModel

logger = get_task_logger(__name__)

CHUNK_BATCH_SIZE = 20


# ─── 1. COORDINATOR TASK (Master) ───────────────────────────────────────────
@celery_app.task(bind=True, name="rag_engine.ingestion.celery_tasks.process_document_task")
def process_document_task(self, document_id: str, file_path: str):
    """
    1. Parses the entire document in a single continuous pass to guarantee
       that multi-page paragraphs and tables are never split mid-context.
    2. Chunks the document into semantic units.
    3. Distributes chunk batches across all available Celery workers in parallel.
    4. Gathers all batch results via a Celery Chord and finalizes the document.
    """
    logger.info(f"Starting single-pass partitioning for document_id={document_id} from {file_path}")
    db = next(get_db())
    try:
        doc_uuid = UUID(document_id)
        doc = db.query(DocumentModel).filter(DocumentModel.document_id == doc_uuid).first()
        if not doc:
            raise ValueError(f"Document with ID {document_id} not found in database")
    finally:
        db.close()

    self.update_state(state="PROGRESS", meta={"step": "partitioning"})
    total_elements = partition_document(str(file_path))

    self.update_state(state="PROGRESS", meta={"step": "chunking"})
    total_chunks = create_chunks_by_title(total_elements)
    total_pages = len({e.metadata.page_number for e in total_elements if e.metadata.page_number})

    if not total_chunks:
        db = next(get_db())
        try:
            doc = db.query(DocumentModel).filter(DocumentModel.document_id == doc_uuid).first()
            if doc:
                doc.total_page = total_pages
                doc.total_chunk = 0
                db.commit()
        finally:
            db.close()
        return {
            "status": "completed",
            "document_id": str(document_id),
            "total_page": total_pages,
            "total_chunk": 0,
        }


    serialized_chunks = [serialize_chunk(chunk) for chunk in total_chunks]

    #Divide chunks into parallel subtask batches (e.g. 20 chunks per worker)
    batch_subtasks = []
    for i in range(0, len(serialized_chunks), CHUNK_BATCH_SIZE):
        chunk_slice = serialized_chunks[i : i + CHUNK_BATCH_SIZE]
        batch_subtasks.append(
            process_chunk_batch_task.s(
                document_id=document_id,
                chunk_batch=chunk_slice,
                start_index=i,
            )
        )

    self.update_state(
        state="PROGRESS",
        meta={
            "step": "dispatching_parallel_workers",
            "total_chunks": len(serialized_chunks),
            "total_batches": len(batch_subtasks),
        },
    )

    logger.info(
        f"Dispatched {len(batch_subtasks)} parallel chunk batch subtasks "
        f"({len(serialized_chunks)} total chunks) for document {document_id}"
    )

    #Celery Chord runs all batch subtasks in parallel, then executes finalize callback
    callback = finalize_document_task.s(
        document_id=document_id,
        total_pages=total_pages,
        total_chunks=len(serialized_chunks),
    )

    return self.replace(chord(group(batch_subtasks))(callback))


# ─── 2. WORKER BATCH TASK (Parallel Subtasks) ──────────────────────────────
@celery_app.task(bind=True, name="rag_engine.ingestion.celery_tasks.process_chunk_batch_task")
def process_chunk_batch_task(self, document_id: str, chunk_batch: list, start_index: int):
    """
    Parallel Subtask: Runs concurrently on any available worker.
    Processes AI summarization (GPT-4o-mini) and vector embeddings (OpenAI 1536d)
    for a slice of chunks, then batch-commits them directly to PostgreSQL.
    """
    logger.info(
        f"Worker processing chunk batch starting at index {start_index} "
        f"({len(chunk_batch)} chunks) for document {document_id}"
    )
    db = next(get_db())
    try:
        doc_uuid = UUID(document_id)
        doc = db.query(DocumentModel).filter(DocumentModel.document_id == doc_uuid).first()
        if not doc:
            logger.warning(f"Document {document_id} was deleted. Skipping chunk batch.")
            return {"status": "skipped", "start_index": start_index, "count": 0}

        llm = get_llm()
        embeddings = get_embedding()

        # 1. Summarize chunks containing mixed content (tables/images) with LLM
        langchain_docs = [process_chunk_dict(c, llm) for c in chunk_batch]

        # 2. Generate vector embeddings for the batch
        texts = [doc.page_content for doc in langchain_docs]
        vectors = embeddings.embed_documents(texts)

        # 3. Construct ChunkModel ORM objects
        chunk_objects = []
        for idx, (lang_doc, vector) in enumerate(zip(langchain_docs, vectors)):
            chunk_idx = start_index + idx
            chunk_objects.append(
                ChunkModel(
                    chunk_id=uuid4(),
                    document_id=doc_uuid,
                    chunk_index=chunk_idx,
                    content=lang_doc.page_content,
                    embedding=vector,
                    chunk_metadata={
                        "document_id": document_id,
                        **lang_doc.metadata,
                    },
                )
            )

        # 4. Batch insert into PostgreSQL
        db.add_all(chunk_objects)
        db.commit()

        logger.info(
            f"Committed batch of {len(chunk_objects)} chunks "
            f"(index {start_index}..{start_index + len(chunk_objects) - 1}) for document {document_id}"
        )
        return {
            "status": "completed",
            "start_index": start_index,
            "count": len(chunk_objects),
        }
    except Exception as exc:
        db.rollback()
        logger.error(
            f"Error processing chunk batch at start_index={start_index} for document {document_id}: {exc}",
            exc_info=True,
        )
        raise exc
    finally:
        db.close()


# ─── 3. REDUCER / FINALIZER TASK (Callback) ─────────────────────────────────
@celery_app.task(name="rag_engine.ingestion.celery_tasks.finalize_document_task")
def finalize_document_task(batch_results: list, document_id: str, total_pages: int, total_chunks: int):
    """
    Reducer Callback: Executes automatically once ALL parallel chunk batch subtasks finish.
    Finalizes the total_page and total_chunk count on the Document record in PostgreSQL.
    """
    logger.info(
        f"Finalizing document {document_id} after {len(batch_results)} parallel batches completed."
    )
    db = next(get_db())
    try:
        doc_uuid = UUID(document_id)
        doc = db.query(DocumentModel).filter(DocumentModel.document_id == doc_uuid).first()
        if not doc:
            logger.warning(f"Document {document_id} was deleted before finalization.")
            return {"status": "cancelled", "document_id": document_id}

        actual_chunks = sum(r.get("count", 0) for r in batch_results if isinstance(r, dict))

        doc.total_page = total_pages
        doc.total_chunk = actual_chunks if actual_chunks > 0 else total_chunks
        db.commit()

        logger.info(
            f"Document {document_id} fully ingested and finalized: "
            f"{total_pages} pages, {doc.total_chunk} chunks."
        )
        return {
            "status": "completed",
            "document_id": str(document_id),
            "total_page": total_pages,
            "total_chunk": doc.total_chunk,
        }
    except Exception as exc:
        db.rollback()
        logger.error(f"Error finalizing document {document_id}: {exc}", exc_info=True)
        raise exc
    finally:
        db.close()
