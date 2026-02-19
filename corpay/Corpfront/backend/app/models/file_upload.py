from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
import enum
from app.database import Base


class FileType(str, enum.Enum):
    REVENUE = "revenue"
    PAYMENTS = "payments"
    SYSTEM_PERFORMANCE = "system_performance"
    EMPLOYEE_DATA = "employee_data"
    EMPLOYEE_PHOTO = "employee_photo"
    SLIDESHOW = "slideshow"


class FileUpload(Base):
    __tablename__ = "file_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    storage_url = Column(String(1000))  # Full public URL for persistence (e.g. https://api.example.com/uploads/...)
    file_type = Column(Enum(FileType), nullable=False, index=True)
    file_size = Column(Integer)  # Size in bytes
    processed = Column(Integer, default=0)  # 0 = not processed, 1 = processed
    error_message = Column(String(500))
    uploaded_by = Column(String(100))  # User email or ID
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

