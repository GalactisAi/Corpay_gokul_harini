from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Literal
from datetime import datetime
from urllib.parse import urlparse
from app.database import get_db
from app.utils.auth import get_current_admin_user
from app.utils.file_handler import save_uploaded_file, get_file_size_mb
from app.models.user import User
from app.models.file_upload import FileUpload, FileType
from pydantic import BaseModel
import json
import os
from pathlib import Path
from app.config import settings
import subprocess
import shutil
import sys
import re
import tempfile
from pptx import Presentation
from io import BytesIO
from PIL import Image
import io

router = APIRouter(prefix="/api", tags=["slideshow"])


def _find_libreoffice() -> str:
    """Find LibreOffice (soffice) executable on Windows, macOS, or Linux."""
    if sys.platform == "win32":
        candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            "soffice",
            "libreoffice",
        ]
    elif sys.platform == "darwin":
        candidates = [
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
            "soffice",
            "libreoffice",
        ]
    else:
        candidates = [
            "/usr/bin/soffice",
            "/usr/bin/libreoffice",
            "soffice",
            "libreoffice",
        ]

    for path in candidates:
        try:
            if os.sep in path and not os.path.exists(path):
                continue
            result = subprocess.run(
                [path, "--version"],
                capture_output=True,
                timeout=10,
                text=True,
                cwd=os.path.expanduser("~"),
            )
            out = (result.stdout or "") + (result.stderr or "")
            if result.returncode == 0 or "LibreOffice" in out:
                return path
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
            continue
    raise FileNotFoundError(
        "LibreOffice not found. Install it: "
        "Windows: https://www.libreoffice.org/download/download/ | "
        "macOS: brew install --cask libreoffice | "
        "Linux: sudo apt install libreoffice (or equivalent)."
    )


class SlideshowState(BaseModel):
    is_active: bool
    type: Literal["file", "url"] = "file"
    source: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    started_at: Optional[datetime] = None
    interval_seconds: Optional[int] = 5


class SlideshowStartBody(BaseModel):
    interval_seconds: Optional[int] = 5


class SlideshowSetUrlBody(BaseModel):
    embed_url: str


def _is_valid_url(url: str) -> bool:
    try:
        parsed = urlparse(url.strip())
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


# In-memory storage for slideshow state (can be moved to database later)
_slideshow_state = {
    "is_active": False,
    "type": "file",
    "source": None,
    "file_url": None,
    "file_name": None,
    "started_at": None,
    "interval_seconds": 5
}


@router.post("/admin/slideshow/upload-dev")
async def upload_ppt_file_dev(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload PowerPoint or PDF file for slideshow (development mode - no auth required)"""
    if not file.filename or not file.filename.lower().endswith(('.pptx', '.ppt', '.pdf')):
        raise HTTPException(status_code=400, detail="File must be PowerPoint (.pptx, .ppt) or PDF (.pdf)")
    
    # Save file
    file_path = save_uploaded_file(file, "slideshow")
    file_size = get_file_size_mb(file_path)
    
    # Record upload (optional - for tracking)
    # Note: Using EMPLOYEE_DATA as placeholder since PPT files don't have a dedicated type
    try:
        file_upload = FileUpload(
            original_filename=file.filename,
            stored_path=file_path,
            file_type=FileType.EMPLOYEE_DATA,  # Placeholder type
            file_size=int(file_size * 1024 * 1024),
            uploaded_by="dev_user"
        )
        db.add(file_upload)
        db.commit()
    except Exception as e:
        # Log but don't fail if file upload record fails
        print(f"Warning: Could not record file upload: {e}")
    
    # Construct file URL
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
    file_url = f"{API_BASE_URL}/uploads/{file_path}"
    
    # Update slideshow state with file info (but don't activate yet)
    _slideshow_state["type"] = "file"
    _slideshow_state["source"] = file_url
    _slideshow_state["file_url"] = file_url
    _slideshow_state["file_name"] = file.filename
    
    return {
        "message": "File uploaded successfully",
        "file_url": file_url,
        "file_name": file.filename,
        "file_path": file_path
    }


@router.post("/admin/slideshow/upload")
async def upload_ppt_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Upload PowerPoint or PDF file for slideshow"""
    if not file.filename or not file.filename.lower().endswith(('.pptx', '.ppt', '.pdf')):
        raise HTTPException(status_code=400, detail="File must be PowerPoint (.pptx, .ppt) or PDF (.pdf)")
    
    # Save file
    file_path = save_uploaded_file(file, "slideshow")
    file_size = get_file_size_mb(file_path)
    
    # Record upload (optional - for tracking)
    # Note: Using EMPLOYEE_DATA as placeholder since PPT files don't have a dedicated type
    try:
        file_upload = FileUpload(
            original_filename=file.filename,
            stored_path=file_path,
            file_type=FileType.EMPLOYEE_DATA,  # Placeholder type
            file_size=int(file_size * 1024 * 1024),
            uploaded_by=current_user.email
        )
        db.add(file_upload)
        db.commit()
    except Exception as e:
        # Log but don't fail if file upload record fails
        print(f"Warning: Could not record file upload: {e}")
    
    # Construct file URL
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
    file_url = f"{API_BASE_URL}/uploads/{file_path}"
    
    # Update slideshow state with file info (but don't activate yet)
    _slideshow_state["type"] = "file"
    _slideshow_state["source"] = file_url
    _slideshow_state["file_url"] = file_url
    _slideshow_state["file_name"] = file.filename
    
    return {
        "message": "File uploaded successfully",
        "file_url": file_url,
        "file_name": file.filename,
        "file_path": file_path
    }


@router.post("/admin/slideshow/set-url-dev")
async def set_slideshow_url_dev(
    body: SlideshowSetUrlBody,
    db: Session = Depends(get_db)
):
    """Set Power BI (or other) embed URL for slideshow (development mode - no auth required)"""
    url = (body.embed_url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="embed_url is required")
    if not _is_valid_url(url):
        raise HTTPException(status_code=400, detail="Invalid URL. Must be a valid http or https URL.")
    _slideshow_state["type"] = "url"
    _slideshow_state["source"] = url
    _slideshow_state["file_url"] = None
    _slideshow_state["file_name"] = None
    return {
        "message": "Embed URL set successfully",
        "source": url,
        "type": "url"
    }


@router.post("/admin/slideshow/set-url")
async def set_slideshow_url(
    body: SlideshowSetUrlBody,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Set Power BI (or other) embed URL for slideshow"""
    url = (body.embed_url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="embed_url is required")
    if not _is_valid_url(url):
        raise HTTPException(status_code=400, detail="Invalid URL. Must be a valid http or https URL.")
    _slideshow_state["type"] = "url"
    _slideshow_state["source"] = url
    _slideshow_state["file_url"] = None
    _slideshow_state["file_name"] = None
    return {
        "message": "Embed URL set successfully",
        "source": url,
        "type": "url"
    }


@router.post("/admin/slideshow/start-dev")
async def start_slideshow_dev(
    body: Optional[SlideshowStartBody] = Body(default=None),
    db: Session = Depends(get_db)
):
    """Start the slideshow on frontend dashboard (development mode - no auth required)"""
    source = _slideshow_state.get("source") or _slideshow_state.get("file_url")
    if not source:
        raise HTTPException(status_code=400, detail="No presentation set. Please upload a file or set an embed URL first.")
    
    if body and body.interval_seconds is not None:
        _slideshow_state["interval_seconds"] = max(1, min(300, body.interval_seconds))  # clamp 1–300
    _slideshow_state["is_active"] = True
    _slideshow_state["started_at"] = datetime.now()
    
    return {
        "message": "Slideshow started",
        "is_active": True,
        "type": _slideshow_state.get("type", "file"),
        "source": source,
        "file_url": _slideshow_state["file_url"],
        "file_name": _slideshow_state["file_name"],
        "interval_seconds": _slideshow_state["interval_seconds"]
    }


@router.post("/admin/slideshow/start")
async def start_slideshow(
    body: Optional[SlideshowStartBody] = Body(default=None),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Start the slideshow on frontend dashboard"""
    source = _slideshow_state.get("source") or _slideshow_state.get("file_url")
    if not source:
        raise HTTPException(status_code=400, detail="No presentation set. Please upload a file or set an embed URL first.")
    
    if body and body.interval_seconds is not None:
        _slideshow_state["interval_seconds"] = max(1, min(300, body.interval_seconds))
    _slideshow_state["is_active"] = True
    _slideshow_state["started_at"] = datetime.now()
    
    return {
        "message": "Slideshow started",
        "is_active": True,
        "type": _slideshow_state.get("type", "file"),
        "source": source,
        "file_url": _slideshow_state["file_url"],
        "file_name": _slideshow_state["file_name"],
        "interval_seconds": _slideshow_state["interval_seconds"]
    }


@router.post("/admin/slideshow/stop-dev")
async def stop_slideshow_dev(
    db: Session = Depends(get_db)
):
    """Stop the slideshow on frontend dashboard (development mode - no auth required)"""
    _slideshow_state["is_active"] = False
    _slideshow_state["started_at"] = None
    
    return {
        "message": "Slideshow stopped",
        "is_active": False
    }


@router.post("/admin/slideshow/stop")
async def stop_slideshow(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Stop the slideshow on frontend dashboard"""
    _slideshow_state["is_active"] = False
    _slideshow_state["started_at"] = None
    
    return {
        "message": "Slideshow stopped",
        "is_active": False
    }


@router.get("/dashboard/slideshow", response_model=SlideshowState)
async def get_slideshow_state(db: Session = Depends(get_db)):
    """Get current slideshow state (public endpoint for frontend dashboard). Returns type ('file'|'url'), source (path or link), interval_seconds."""
    slideshow_type = _slideshow_state.get("type", "file")
    source = _slideshow_state.get("source") or _slideshow_state.get("file_url")
    return SlideshowState(
        is_active=_slideshow_state["is_active"],
        type=slideshow_type,
        source=source,
        file_url=_slideshow_state["file_url"],
        file_name=_slideshow_state["file_name"],
        started_at=_slideshow_state["started_at"],
        interval_seconds=_slideshow_state.get("interval_seconds", 5)
    )


@router.get("/dashboard/slideshow/slides")
async def get_slide_images(db: Session = Depends(get_db)):
    """Convert PPT/PPTX or PDF to slide images for display."""
    if not _slideshow_state["file_url"]:
        raise HTTPException(status_code=404, detail="No presentation file uploaded")
    
    file_path = _slideshow_state["file_url"].replace(f"{os.getenv('API_BASE_URL', 'http://localhost:8000')}/uploads/", "")
    upload_dir = Path(settings.upload_dir)
    full_file_path = upload_dir / file_path
    
    if not full_file_path.exists():
        raise HTTPException(status_code=404, detail="Presentation file not found")
    
    slides_dir = upload_dir / "slideshow" / "slides"
    slides_dir.mkdir(parents=True, exist_ok=True)
    
    base_name = full_file_path.stem
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
    suffix = full_file_path.suffix.lower()

    # PDF: convert each page to PNG with PyMuPDF (no LibreOffice needed)
    if suffix == ".pdf":
        try:
            import fitz  # PyMuPDF
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="PDF support requires the pymupdf package. Install with: pip install pymupdf",
            )
        try:
            # Cache: return existing slides if same file (path + mtime) was already converted
            meta_path = slides_dir / f"{base_name}.pdf.meta"
            file_mtime = str(full_file_path.stat().st_mtime)
            file_key = f"{full_file_path.resolve()}\n{file_mtime}"
            if meta_path.exists():
                try:
                    with open(meta_path, "r") as f:
                        if f.read().strip() == file_key:
                            cached = sorted(slides_dir.glob(f"{base_name}_*.png"), key=lambda p: int(p.stem.rsplit("_", 1)[-1]))
                            if cached:
                                slide_images = [f"{API_BASE_URL}/uploads/slideshow/slides/{p.name}" for p in cached]
                                print(f"[Slideshow] PDF serving {len(slide_images)} cached slides")
                                return {"slides": slide_images, "use_viewer": False}
                except (ValueError, OSError):
                    pass
            for old in slides_dir.glob(f"{base_name}*.png"):
                try:
                    old.unlink()
                except OSError:
                    pass
            for old in slides_dir.glob(f"{base_name}.pdf.meta"):
                try:
                    old.unlink()
                except OSError:
                    pass
            # 1.5x scale for faster conversion (was 2.0)
            PDF_SCALE = 1.5
            doc = fitz.open(str(full_file_path))
            slide_images = []
            for i in range(len(doc)):
                page = doc[i]
                mat = fitz.Matrix(PDF_SCALE, PDF_SCALE)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                out_path = slides_dir / f"{base_name}_{i + 1}.png"
                pix.save(str(out_path))
                slide_images.append(f"{API_BASE_URL}/uploads/slideshow/slides/{out_path.name}")
            doc.close()
            if slide_images:
                with open(meta_path, "w") as f:
                    f.write(file_key)
                print(f"[Slideshow] PDF converted to {len(slide_images)} slides")
                return {"slides": slide_images, "use_viewer": False}
            raise HTTPException(status_code=500, detail="PDF has no pages")
        except fitz.FileDataError as e:
            raise HTTPException(status_code=400, detail=f"Invalid or corrupted PDF: {e}")
        except Exception as e:
            print(f"[Slideshow] PDF conversion error: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to convert PDF to images: {e}")

    # PPT/PPTX: use LibreOffice to convert each slide to an image
    try:
        libreoffice_cmd = _find_libreoffice()
        print(f"[Slideshow] Using LibreOffice at: {libreoffice_cmd}")

        # Clear previous conversion outputs for this file so we don't return stale slides
        for old in slides_dir.glob(f"{base_name}*.png"):
            try:
                old.unlink()
            except OSError:
                pass

        print(f"[Slideshow] Converting {full_file_path} to images using LibreOffice...")
        # Use a temp dir as "user profile" to avoid lock/profile issues when multiple conversions run
        with tempfile.TemporaryDirectory(prefix="libreoffice_") as tmpdir:
            user_install = Path(tmpdir).as_uri()
            result = subprocess.run(
                [
                    libreoffice_cmd,
                    "--headless",
                    "--invisible",
                    "--nologo",
                    "--nofirststartwizard",
                    f"-env:UserInstallation={user_install}",
                    "--convert-to", "png",
                    "--outdir", str(slides_dir.resolve()),
                    str(full_file_path.resolve()),
                ],
                capture_output=True,
                timeout=180,
                text=True,
            )

        print(f"[Slideshow] LibreOffice exit code: {result.returncode}")
        if result.stdout:
            print(f"[Slideshow] LibreOffice stdout: {result.stdout}")
        if result.stderr:
            print(f"[Slideshow] LibreOffice stderr: {result.stderr}")

        if result.returncode == 0:
            # LibreOffice outputs: base_name_1.png, base_name_2.png, ... or base_name.png for single slide
            slide_files = list(slides_dir.glob(f"{base_name}*.png"))
            if not slide_files:
                print("[Slideshow] No slide images found after conversion")
            else:
                def _slide_order(p: Path) -> tuple:
                    name = p.stem
                    if name == base_name:
                        return (0,)  # base_name.png = single slide, first
                    m = re.search(r"_(\d+)$", name)
                    return (1, int(m.group(1))) if m else (2, name)

                slide_files.sort(key=_slide_order)
                slide_images = [
                    f"{API_BASE_URL}/uploads/slideshow/slides/{p.name}"
                    for p in slide_files
                ]
                print(f"[Slideshow] Successfully converted {len(slide_images)} slides")
                return {"slides": slide_images, "use_viewer": False}
        else:
            print(f"[Slideshow] LibreOffice conversion failed with code {result.returncode}")
    except FileNotFoundError as e:
        print(f"[Slideshow] LibreOffice not found: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
    except subprocess.TimeoutExpired:
        print("[Slideshow] LibreOffice conversion timed out")
        raise HTTPException(
            status_code=504,
            detail="Slide conversion timed out. Try a smaller presentation or install LibreOffice locally.",
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Slideshow] LibreOffice conversion error: {e}")
        import traceback
        traceback.print_exc()
    
    # If LibreOffice fails, return error
    raise HTTPException(
        status_code=500,
        detail="Failed to convert PPT to images. Install LibreOffice or use a PDF file for best compatibility.",
    )
