"""Bound uploads without allocating recording-sized byte arrays."""
import os
from fastapi import HTTPException, UploadFile


async def validate_upload(upload: UploadFile, kind: str) -> int:
    maximum = int(os.getenv(f"MAX_{kind.upper()}_UPLOAD_MB", "16" if kind == "audio" else "64")) * 1024**2
    size = 0
    await upload.seek(0)
    try:
        while chunk := await upload.read(64 * 1024):
            size += len(chunk)
            if size > maximum:
                raise HTTPException(status_code=413, detail=f"The {kind} recording exceeds the {maximum // 1024**2} MB upload limit.")
        if kind == "audio" and size < 200:
            raise HTTPException(status_code=415, detail="Media missing usable audio")
        return size
    finally:
        await upload.seek(0)
