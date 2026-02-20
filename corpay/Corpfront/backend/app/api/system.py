from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.system_performance import SystemPerformance
from app.models.file_upload import FileUpload, FileType
from app.schemas.system_performance import SystemPerformanceCreate, SystemPerformanceResponse
from app.utils.auth import get_current_admin_user
from app.utils.file_handler import save_uploaded_file, get_file_size_mb
from app.services.excel_parser import ExcelParser
from app.models.user import User

router = APIRouter(prefix="/api/admin/system", tags=["admin-system"])


@router.post("/upload")
async def upload_system_performance_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Upload system performance Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be Excel format")
    
    stored_path, local_path = save_uploaded_file(file, "system")
    file_size = get_file_size_mb(stored_path)
    
    file_upload = FileUpload(
        original_filename=file.filename,
        stored_path=stored_path,
        file_type=FileType.SYSTEM_PERFORMANCE,
        file_size=int(file_size * 1024 * 1024),
        uploaded_by=current_user.email
    )
    db.add(file_upload)
    
    try:
        parser = ExcelParser()
        parse_path = local_path if local_path else f"uploads/{stored_path}"
        data = parser.parse_system_performance_file(parse_path)
        
        performance = SystemPerformance(**data)
        db.add(performance)
        
        file_upload.processed = 1
        db.commit()
        
        return {"message": "File processed successfully", "file_id": file_upload.id}
    
    except Exception as e:
        file_upload.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.post("", response_model=SystemPerformanceResponse)
async def create_system_performance(
    performance: SystemPerformanceCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Manually create system performance entry"""
    db_performance = SystemPerformance(**performance.dict())
    db.add(db_performance)
    db.commit()
    db.refresh(db_performance)
    return db_performance

