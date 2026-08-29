from pathlib import Path
from unstructured.partition.pdf import partition_pdf


def is_pdf_file(file_path: str) -> bool:
    return Path(file_path).suffix.lower() == ".pdf"


def partition_document(file_path: str):
    if not is_pdf_file(file_path):
        raise ValueError(f"Not a PDF file: {file_path}")

    elements = partition_pdf(
        filename=file_path,
        strategy="hi_res", 
        infer_table_structure=True, 
        extract_image_block_types=["Image"], 
        extract_image_block_to_payload=True 
    )

    page_numbers = {e.metadata.page_number for e in elements if e.metadata.page_number}
    
    print(f"Extracted {len(elements)} elements")
    print(f"Extracted {len(page_numbers)} pages")
    return elements



