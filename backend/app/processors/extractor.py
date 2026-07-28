from pathlib import Path
from typing import Any

def extract_text(file_path: str) -> str:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        import fitz
        text = ""
        try:
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text() + "\n"
        except Exception:
            pass
        return text

    if ext == ".docx":
        from docx import Document as DocxDocument
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
        import fitz
        try:
            with fitz.open(file_path) as doc:
                for i in range(len(doc)):
                    page = doc[i]
                    image_list = page.get_images(full=True)
                    for img_index, img in enumerate(image_list):
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]
                        images.append({
                            "name": f"page_{i + 1}_{img_index + 1}.{image_ext}",
                            "data": image_bytes,
                            "content_type": f"image/{image_ext}",
                            "page": i + 1,
                        })
        except Exception:
            pass

    elif ext == ".docx":
        from docx import Document as DocxDocument
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
