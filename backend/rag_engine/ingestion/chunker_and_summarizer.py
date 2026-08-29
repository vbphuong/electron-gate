from unstructured.chunking.title import chunk_by_title
import json
from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
from langchain_community.callbacks.manager import get_openai_callback


def create_chunks_by_title(elements):
    chunks = chunk_by_title(
        elements,
        max_characters=6000,
        new_after_n_chars=4400,
        combine_text_under_n_chars=1500,
    )
    print(f"Created {len(chunks)} chunks")
    return chunks


def separate_content_types(chunk):
    content_data = {
        'text': chunk.text if hasattr(chunk, 'text') else str(chunk),
        'tables': [],
        'images': [],
        'types': ['text'],
    }

    if hasattr(chunk, 'metadata') and hasattr(chunk.metadata, 'orig_elements'):
        for element in chunk.metadata.orig_elements:
            element_type = type(element).__name__

            if element_type == 'Table':
                content_data['types'].append('table')
                table_html = getattr(element.metadata, 'text_as_html', element.text)
                content_data['tables'].append(table_html)

            elif element_type == 'Image':
                if hasattr(element, 'metadata') and hasattr(element.metadata, 'image_base64'):
                    content_data['types'].append('image')
                    content_data['images'].append(element.metadata.image_base64)

    content_data['types'] = list(set(content_data['types']))
    return content_data


def serialize_chunk(chunk) -> Dict[str, Any]:
    """
    Serializes an unstructured composite chunk into a lightweight,
    JSON-serializable dictionary for Celery distributed worker tasks.
    """
    content_data = separate_content_types(chunk)
    meta_dict = {}
    if hasattr(chunk, 'metadata'):
        if hasattr(chunk.metadata, 'page_number') and chunk.metadata.page_number:
            meta_dict['page_number'] = chunk.metadata.page_number
        if hasattr(chunk.metadata, 'filename') and chunk.metadata.filename:
            meta_dict['filename'] = chunk.metadata.filename

    return {
        "text": content_data["text"],
        "tables": content_data["tables"],
        "images": content_data["images"],
        "types": content_data["types"],
        "metadata": meta_dict,
    }


def create_ai_summary(text: str, tables: List[str], images: List[str], llm) -> str:
    with get_openai_callback() as cb:
        try:
            prompt_text = f"""You are creating a searchable description for document content retrieval.

            CONTENT TO ANALYZE:
            TEXT CONTENT:
            {text}

            """

            if tables:
                prompt_text += "TABLES:\n"
                for i, table in enumerate(tables):
                    prompt_text += f"Table {i+1}:\n{table}\n\n"

            prompt_text += """
            YOUR TASK:
            Generate a comprehensive, searchable description that covers:

            1. Key facts, numbers, and data points from text and tables
            2. Main topics and concepts discussed  
            3. Questions this content could answer
            4. Visual content analysis (charts, diagrams, patterns in images)
            5. Alternative search terms users might use

            Make it detailed and searchable - prioritize findability over brevity.

            SEARCHABLE DESCRIPTION:"""

            message_content = [{"type": "text", "text": prompt_text}]

            for image_base64 in images:
                message_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                })

            message = HumanMessage(content=message_content)
            response = llm.invoke([message])

            print(f"Total Tokens: {cb.total_tokens}")
            print(f"Prompt Tokens: {cb.prompt_tokens}")
            print(f"Completion Tokens: {cb.completion_tokens}")
            print(f"Total Cost: ${cb.total_cost}")

            return response.content

        except Exception as e:
            print(f"AI summary failed: {e}")
            # Fallback to simple summary
            summary = f"{text[:300]}..."
            if tables:
                summary += f" [Contains {len(tables)} table(s)]"
            if images:
                summary += f" [Contains {len(images)} image(s)]"
            return summary


def process_chunk_dict(chunk_dict: Dict[str, Any], llm) -> Document:
    """
    Processes a serialized chunk dictionary, generating an AI summary if it contains
    tables or images, and returning a LangChain Document.
    """
    text = chunk_dict.get("text", "")
    tables = chunk_dict.get("tables", [])
    images = chunk_dict.get("images", [])

    if tables or images:
        try:
            enhanced_content = create_ai_summary(text, tables, images, llm)
        except Exception as e:
            print(f"AI summary failed: {e}")
            enhanced_content = text
    else:
        enhanced_content = text

    return Document(
        page_content=enhanced_content,
        metadata={
            "original_content": json.dumps({
                "raw_text": text,
                "tables_html": tables,
                "images_base64": images,
            }),
            **chunk_dict.get("metadata", {}),
        },
    )


def summarise_chunks(chunks, llm):
    langchain_documents = []
    total_chunks = len(chunks)

    for i, chunk in enumerate(chunks):
        current_chunk = i + 1
        print(f"   Processing chunk {current_chunk}/{total_chunks}")
        if isinstance(chunk, dict):
            doc = process_chunk_dict(chunk, llm)
        else:
            content_data = separate_content_types(chunk)
            if content_data['tables'] or content_data['images']:
                try:
                    enhanced_content = create_ai_summary(
                        content_data['text'],
                        content_data['tables'],
                        content_data['images'],
                        llm,
                    )
                except Exception as e:
                    print(f"AI summary failed: {e}")
                    enhanced_content = content_data['text']
            else:
                enhanced_content = content_data['text']

            doc = Document(
                page_content=enhanced_content,
                metadata={
                    "original_content": json.dumps({
                        "raw_text": content_data['text'],
                        "tables_html": content_data['tables'],
                        "images_base64": content_data['images'],
                    }),
                },
            )

        langchain_documents.append(doc)

    print(f"Processed {len(langchain_documents)} chunks")
    return langchain_documents
