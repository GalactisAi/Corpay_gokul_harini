from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.payments import PaymentData
from app.models.file_upload import FileUpload, FileType
from app.schemas.payments import PaymentDataCreate, PaymentDataResponse
from app.utils.auth import get_current_admin_user
from app.utils.file_handler import save_uploaded_file, get_file_size_mb
from app.services.excel_parser import ExcelParser
from app.models.user import User

router = APIRouter(prefix="/api/admin/payments", tags=["admin-payments"])


@router.post("/upload")
async def upload_payments_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Upload payments Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be Excel format")
    
    stored_path, local_path = save_uploaded_file(file, "payments")
    file_size = get_file_size_mb(stored_path)
    
    file_upload = FileUpload(
        original_filename=file.filename,
        stored_path=stored_path,
        file_type=FileType.PAYMENTS,
        file_size=int(file_size * 1024 * 1024),
        uploaded_by=current_user.email
    )
    db.add(file_upload)
    
    try:
        parser = ExcelParser()
        parse_path = local_path if local_path else f"uploads/{stored_path}"
        data = parser.parse_payments_file(parse_path)
        
        # Check if payment data for this date already exists
        existing = db.query(PaymentData).filter(PaymentData.date == data["date"]).first()
        
        if existing:
            existing.amount_processed = data["amount_processed"]
            existing.transaction_count = data["transaction_count"]
        else:
            payment = PaymentData(**data)
            db.add(payment)
        
        file_upload.processed = 1
        db.commit()
        
        return {"message": "File processed successfully", "file_id": file_upload.id}
    
    except Exception as e:
        file_upload.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.post("", response_model=PaymentDataResponse)
async def create_payment_data(
    payment: PaymentDataCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Manually create payment data"""
    # Check if data for this date already exists
    existing = db.query(PaymentData).filter(PaymentData.date == payment.date).first()
    if existing:
        existing.amount_processed = payment.amount_processed
        existing.transaction_count = payment.transaction_count
        db.commit()
        db.refresh(existing)
        return existing
    
    db_payment = PaymentData(**payment.dict())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

