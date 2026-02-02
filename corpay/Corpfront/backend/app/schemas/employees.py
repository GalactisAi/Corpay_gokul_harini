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
    avatar_path: Optional[str]
    border_color: str
    background_color: str
    milestone_type: str
    department: Optional[str]
    milestone_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

