from __future__ import annotations

import tempfile
from pathlib import Path

import httpx

from app.config import (
    MEDIA_DIR,
    NHOST_ADMIN_SECRET,
    NHOST_STORAGE_BUCKET,
    STORAGE_BACKEND,
    ensure_data_dirs,
    nhost_storage_base_url,
)

NHOST_PREFIX = "nhost://"


def attempt_dir(session_id: str, attempt_id: str) -> Path:
    ensure_data_dirs()
    path = MEDIA_DIR / session_id / attempt_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _nhost_headers() -> dict[str, str]:
    # hasura-storage accepts admin secret for server-side ops
    return {"x-hasura-admin-secret": NHOST_ADMIN_SECRET}


async def _save_local(session_id: str, attempt_id: str, field: str, filename: str, data: bytes) -> str:
    directory = attempt_dir(session_id, attempt_id)
    suffix = Path(filename).suffix or (".webm" if field == "audio" else ".mp4")
    dest = directory / f"{field}{suffix}"
    dest.write_bytes(data)
    return str(dest)


async def _save_nhost(session_id: str, attempt_id: str, field: str, filename: str, data: bytes) -> str:
    base = nhost_storage_base_url()
    if not base or not NHOST_ADMIN_SECRET:
        raise RuntimeError("Nhost storage is not configured (NHOST_SUBDOMAIN/REGION/ADMIN_SECRET).")

    suffix = Path(filename).suffix or (".webm" if field == "audio" else ".mp4")
    object_name = f"{session_id}/{attempt_id}/{field}{suffix}"
    content_type = "audio/webm" if field == "audio" else "video/webm"
    if suffix == ".wav":
        content_type = "audio/wav"

    files = {"file[]": (object_name, data, content_type)}
    form = {"bucket-id": NHOST_STORAGE_BUCKET}
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(f"{base}/files", headers=_nhost_headers(), data=form, files=files)
    if res.status_code >= 400:
        raise RuntimeError(f"Nhost upload failed ({res.status_code}): {res.text[:300]}")

    payload = res.json()
    processed = payload.get("processedFiles") or payload.get("processed_files") or []
    if not processed:
        raise RuntimeError(f"Nhost upload returned no file id: {payload}")
    file_id = processed[0].get("id")
    if not file_id:
        raise RuntimeError(f"Nhost upload missing id: {processed[0]}")
    return f"{NHOST_PREFIX}{file_id}"


async def save_upload(session_id: str, attempt_id: str, field: str, filename: str, data: bytes) -> str:
    if STORAGE_BACKEND == "nhost":
        return await _save_nhost(session_id, attempt_id, field, filename, data)
    return await _save_local(session_id, attempt_id, field, filename, data)


def resolve_local_path(ref: str) -> str:
    """Return a filesystem path for STT. Downloads Nhost objects to a temp file when needed."""
    if not ref:
        return ""
    if not ref.startswith(NHOST_PREFIX):
        return ref

    file_id = ref[len(NHOST_PREFIX) :]
    base = nhost_storage_base_url()
    if not base or not NHOST_ADMIN_SECRET:
        return ""

    url = f"{base}/files/{file_id}"
    with httpx.Client(timeout=60) as client:
        res = client.get(url, headers=_nhost_headers())
    if res.status_code >= 400:
        return ""

    suffix = ".webm"
    cd = res.headers.get("content-disposition") or ""
    if ".wav" in cd:
        suffix = ".wav"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(res.content)
    tmp.close()
    return tmp.name
