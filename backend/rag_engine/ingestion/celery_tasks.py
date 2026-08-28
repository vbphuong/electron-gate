from uuid import UUID, uuid4
from celery.utils.log import get_task_logger

from rag_engine.celery_app import celery_app
from rag_engine.ingestion.document_loader import partition_document
from rag_engine.ingestion.chunker_and_summarizer import create_chunks_by_title, summarise_chunks
from api.deps import get_db, get_llm, get_embedding
from api.models import Document as DocumentModel, Chunk as ChunkModel

logger = get_task_logger(__name__)

CHUNK_BATCH_SIZE = 100


@celery_app.task(bind=True, name="rag_engine.ingestion.celery_tasks.process_document_task")
def process_document_task(self, document_id: str, file_path: str):
    """
    Celery task to asynchronously parse, chunk, summarize, and embed a document.
    - Obtains DB session via get_db() from api.deps.
    - Injects LLM and Embedding clients via get_llm() and get_embedding() from api.deps.
    - Executes batch queries/commits for chunks instead of individual queries.
    - Retains individual query and update for the Document record.
    """
    logger.info(f"Starting background ingestion for document_id={document_id} from file={file_path}")
    db = next(get_db())
    try:
        doc_uuid = UUID(document_id)
        # Individual document query
        doc = db.query(DocumentModel).filter(DocumentModel.document_id == doc_uuid).first()
        if not doc:
            raise ValueError(f"Document with ID {document_id} not found in database")

        self.update_state(state="PROGRESS", meta={"step": "partitioning"})
        total_elements = partition_document(str(file_path))

        self.update_state(state="PROGRESS", meta={"step": "chunking"})
        total_chunks = create_chunks_by_title(total_elements)
        total_pages = len({e.metadata.page_number for e in total_elements if e.metadata.page_number})

        self.update_state(state="PROGRESS", meta={"step": "summarizing"})
        llm = get_llm()
        summarized_chunks = summarise_chunks(total_chunks, llm)

        self.update_state(state="PROGRESS", meta={"step": "embedding"})
        embeddings = get_embedding()

        # Build chunk records
        chunk_objects = []
        if summarized_chunks:
            texts = [chunk.page_content for chunk in summarized_chunks]
            vectors = embeddings.embed_documents(texts)

            for idx, (chunk, vector) in enumerate(zip(summarized_chunks, vectors)):
                chunk_objects.append(
                    ChunkModel(
                        chunk_id=uuid4(),
                        document_id=doc.document_id,
                        chunk_index=idx,
                        content=chunk.page_content,
                        embedding=vector,
                        chunk_metadata={
                            "document_id": str(doc.document_id),
                            **chunk.metadata,
                        },
                    )
                )

        # Batch insert and commit chunks instead of individual chunk queries
        if chunk_objects:
            self.update_state(
                state="PROGRESS",
                meta={"step": "storing_chunks", "total_chunks": len(chunk_objects)}
            )
            for i in range(0, len(chunk_objects), CHUNK_BATCH_SIZE):
                chunk_batch = chunk_objects[i : i + CHUNK_BATCH_SIZE]
                db.add_all(chunk_batch)
                db.commit()
                logger.info(f"Committed batch of {len(chunk_batch)} chunks for document {document_id}")

        # Update document individually
        doc.total_page = total_pages
        doc.total_chunk = len(total_chunks)
        db.commit()

        logger.info(
            f"Finished ingestion for document_id={document_id}: "
            f"{total_pages} pages, {len(total_chunks)} chunks"
        )
        return {
            "status": "completed",
            "document_id": str(document_id),
            "total_page": total_pages,
            "total_chunk": len(total_chunks),
        }
    except Exception as exc:
        db.rollback()
        logger.error(f"Ingestion task failed for document_id={document_id}: {exc}", exc_info=True)
        raise exc
    finally:
        db.close()
