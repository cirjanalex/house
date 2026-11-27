"""Explicit network operations; building a scene never calls these."""
import base64
import hashlib
import io
import json
from pathlib import Path
import re
import tarfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ENGINE = "https://registry.npmjs.org/three/-/three-0.160.1.tgz"
INTEGRITY = "Bgl2wPJypDOZ1stAxwfWAcJ0WQf7QzlptsxkjYiURPz+n5k4RBDLsq+6f9Y75TYxn6aHLcWz+JNmwTOXWrQTBQ=="
VENDOR = Path(__file__).resolve().parent / "vendor"
API = "https://api.polyhaven.com"


def fetch(url, limit=32 << 20):
    req = Request(url, headers={"User-Agent": "ConceptRenderer/1.0 (local architectural visualization)"})
    with urlopen(req, timeout=40) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Download exceeds size limit")
    return data


def bootstrap():
    data = fetch(ENGINE)
    if base64.b64encode(hashlib.sha512(data).digest()).decode() != INTEGRITY:
        raise ValueError("Three.js package integrity mismatch")
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        VENDOR.mkdir(exist_ok=True)
        for name in ("build/three.min.js", "LICENSE"):
            (VENDOR / Path(name).name).write_bytes(tar.extractfile("package/" + name).read())


def search(query, kind="textures"):
    words = re.findall(r"[a-z0-9]+", query.lower())
    if not words:
        raise ValueError("Supply at least one search term")
    assets = json.loads(fetch(f"{API}/assets?t={kind}"))
    hits = []
    for key, info in assets.items():
        terms = " ".join([key.replace("_", " "), info["name"], *info.get("tags", []),
                          *info.get("categories", [])]).lower()
        score = sum(word in terms for word in words)
        if score:
            hits.append((-score, key, info["name"]))
    return [{"id": k, "name": n, "source": f"https://polyhaven.com/a/{k}", "license": "CC0-1.0"}
            for _, k, n in sorted(hits)[:12]]


def texture(key, folder):
    if not re.fullmatch(r"[a-z0-9_]+", key):
        raise ValueError("Invalid catalogue ID")
    info = json.loads(fetch(f"{API}/files/{key}"))
    maps = {k.lower(): v for k, v in info.items()}
    entry = (maps.get("diffuse") or maps.get("color") or {}).get("1k", {}).get("jpg")
    if not entry or urlsplit(entry["url"]).hostname not in {"dl.polyhaven.org", "dl.polyhaven.com"}:
        raise ValueError("No supported 1k JPEG diffuse map for this asset")
    data = fetch(entry["url"], 8 << 20)
    if hashlib.md5(data, usedforsecurity=False).hexdigest() != entry["md5"]:
        raise ValueError("Catalogue texture checksum mismatch")
    folder = Path(folder)
    folder.mkdir(exist_ok=True, parents=True)
    filename = f"{key}.jpg"
    (folder / filename).write_bytes(data)
    return {"file": filename, "source": f"https://polyhaven.com/a/{key}", "license": "CC0-1.0",
            "sha256": hashlib.sha256(data).hexdigest()}
