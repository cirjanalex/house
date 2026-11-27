"""Private, deterministic PDF evidence pack. Not part of the web export."""
import hashlib
import json
from contextlib import closing
from pathlib import Path

import pypdfium2 as pdfium


def extract(pdf, target, width=2200):
    pdf, target = Path(pdf), Path(target)
    if not 400 <= width <= 6000:
        raise ValueError("Page width must be between 400 and 6000 pixels")
    target.mkdir(parents=True, exist_ok=True)
    if any(target.iterdir()):
        raise ValueError(f"Intake requires an empty output directory: {target}")
    index = {"sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(), "pages": []}
    with closing(pdfium.PdfDocument(pdf)) as doc:
        for i, page in enumerate(doc, 1):
            with closing(page):
                w, h = page.get_size()
                stem = f"page-{i:02}"
                bitmap = page.render(scale=width / w)
                try:
                    bitmap.to_pil().convert("RGB").save(target / f"{stem}.png")
                finally:
                    bitmap.close()
                with closing(page.get_textpage()) as text:
                    content = text.get_text_bounded()
                (target / f"{stem}.txt").write_text(content, encoding="utf-8")
                index["pages"].append({"page": i, "size_pt": [w, h],
                                       "image": f"{stem}.png", "text": f"{stem}.txt",
                                       "needs_visual_read": not content.strip()})
    (target / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    return index
