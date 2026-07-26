from pathlib import Path
from typing import Any

import pypdf
from docx import Document as DocxDocument
from docx.opc.constants import RELATIONSHIP_TYPE as RT


def extract_text(file_path: str) -> str:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        text = ""
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
        return text

    if ext == ".docx":
        doc = DocxDocument(file_path)
        return "\n".join(p.text for p in doc.paragraphs)

    if ext == ".txt":
        return Path(file_path).read_text(encoding="utf-8", errors="replace")

    if ext in (".ppt", ".pptx"):
        from pptx import Presentation
        prs = Presentation(file_path)
        return "\n".join(
            shape.text for slide in prs.slides for shape in slide.shapes if hasattr(shape, "text")
        )

    raise ValueError(f"Unsupported file type: {ext}")


def extract_images(file_path: str) -> list[dict[str, Any]]:
    path = Path(file_path)
    ext = path.suffix.lower()
    images: list[dict[str, Any]] = []

    if ext == ".pdf":
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for i, page in enumerate(reader.pages):
                for img in page.images:
                    images.append({
                        "name": img.name or f"page_{i + 1}_{len(images)}.png",
                        "data": img.data,
                        "content_type": "image/png",
                        "page": i + 1,
                    })

    elif ext == ".docx":
        doc = DocxDocument(file_path)
        for rel in doc.part.rels.values():
            if "image" in rel.reltype and hasattr(rel, "target_part") and rel.target_part:
                images.append({
                    "name": rel.target_ref.split("/")[-1],
                    "data": rel.target_part.blob,
                    "content_type": rel.target_part.content_type or "image/png",
                    "page": 1,
                })

    elif ext in (".ppt", ".pptx"):
        from pptx import Presentation
        from pptx.enum.shapes import MSO_SHAPE_TYPE
        prs = Presentation(file_path)
        for slide_num, slide in enumerate(prs.slides, 1):
            for shape in slide.shapes:
                if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                    images.append({
                        "name": shape.image.content_type.split("/")[-1] or f"slide_{slide_num}_{len(images)}.png",
                        "data": shape.image.blob,
                        "content_type": shape.image.content_type,
                        "page": slide_num,
                    })

    return images
