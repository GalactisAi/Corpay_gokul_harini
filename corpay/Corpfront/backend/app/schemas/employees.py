from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EmployeeMilestoneCreate(BaseModel):
    name: str
    description: str
    avatar_path: Optional[str] = None
    border_color: str
    background_color: str
    milestone_type: str  # 'anniversary', 'birthday', 'promotion', 'new_hire'
    department: Optional[str] = None
    milestone_date: datetime


class EmployeeMilestoneUpdate(BaseModel):
    name: str
    description: str
    avatar_path: Optional[str] = None
    border_color: str
    background_color: str
    milestone_type: str
    department: Optional[str] = None
    milestone_date: datetime


class EmployeeMilestoneResponse(BaseModel):
    id: int
    name: str
    description: str
    avatar_path: Optional[str] = None
    border_color: str = "#981239"
    background_color: str = "#fef5f8"
    milestone_type: str = "achievement"
    department: Optional[str] = None
    milestone_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

