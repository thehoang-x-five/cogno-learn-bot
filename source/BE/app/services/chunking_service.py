"""
Chunking helpers for document ingestion.
"""
import re
from typing import Any, Dict, List, Optional


PAGE_HEADER_RE = re.compile(r"(?m)^# Page (?P<page>\d+)\s*$")


def _extract_heading(content: str) -> Optional[str]:
    """Return the first markdown heading if the chunk starts with one."""
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            return stripped.lstrip("# ").strip() or None
        return None
    return None


def split_page_sections(text: str) -> List[Dict[str, Any]]:
    """
    Split parser output into page-aware sections using "# Page N" markers.

    The advanced PDF parser already inserts these markers, so chunking must
    preserve them instead of flattening everything into page-less chunks.
    """
    if not text:
        return []

    matches = list(PAGE_HEADER_RE.finditer(text))
    if not matches:
        return []

    sections: List[Dict[str, Any]] = []
    for index, match in enumerate(matches):
        page_number = int(match.group("page"))
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        page_content = text[start:end].strip()
        if not page_content:
            continue
        sections.append({
            "page_number": page_number,
            "content": page_content,
        })
    return sections


def _build_chunks_from_text(
    text: str,
    filename: str,
    splitter: Any,
    page_number: Optional[int] = None,
) -> List[Dict[str, Any]]:
    from llama_index.core import Document as LlamaDocument

    llama_doc = LlamaDocument(
        text=text,
        metadata={"filename": filename, "page_number": page_number},
    )
    nodes = splitter.get_nodes_from_documents([llama_doc])

    chunks: List[Dict[str, Any]] = []
    for node in nodes:
        content = node.get_content().strip()
        if not content:
            continue
        chunks.append({
            "content": content,
            "page_number": page_number,
            "heading": _extract_heading(content),
            "metadata": {
                "chunk_method": "llamaindex_sentence_splitter",
                "node_id": node.node_id,
                "page_number": page_number,
            },
        })
    return chunks


def chunk_text(
    text: str,
    filename: str,
    chunk_size: int = 1024,
    chunk_overlap: int = 200,
) -> List[Dict[str, Any]]:
    """Chunk text with LlamaIndex while preserving PDF page numbers."""
    from llama_index.core.node_parser import SentenceSplitter

    splitter = SentenceSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        paragraph_separator="\n\n",
        secondary_chunking_regex="[.!?]\\s+",
    )

    page_sections = split_page_sections(text)
    if page_sections:
        chunks: List[Dict[str, Any]] = []
        for section in page_sections:
            chunks.extend(
                _build_chunks_from_text(
                    text=section["content"],
                    filename=filename,
                    splitter=splitter,
                    page_number=section["page_number"],
                )
            )
        return chunks

    return _build_chunks_from_text(
        text=text,
        filename=filename,
        splitter=splitter,
        page_number=None,
    )


def build_chroma_metadata(document: Any, chunk: Any) -> Dict[str, Any]:
    """Build Chroma metadata without replacing missing page numbers by 0."""
    metadata: Dict[str, Any] = {
        "document_id": document.id,
        "course_id": document.course_id,
        "heading": chunk.heading or "",
        "filename": document.filename,
    }
    if chunk.page_number is not None:
        metadata["page_number"] = chunk.page_number
    return metadata
