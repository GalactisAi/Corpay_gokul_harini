from pydantic import BaseModel
from typing import Optional


class NewsroomItemResponse(BaseModel):
    """Lightweight representation of a Corpay newsroom article."""

    id: Optional[int] = None  # Stable id for navigation/keying (e.g. index)
    title: str
    url: str
    date: Optional[str] = None
    category: Optional[str] = None
    excerpt: Optional[str] = None

