"""
Pydantic schemas for Feedback Categories.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Category name")
    description: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="What kind of feedback belongs here",
    )
    color: str = Field(
        ...,
        pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
        description="Hex color code (e.g. #4249C9)",
    )
    icon: str | None = Field(
        default=None, max_length=50, description="Lucide icon identifier"
    )
    keywords: list[str] = Field(
        default_factory=list,
        description="List of trigger words for deterministic matching",
    )
    display_order: int | None = Field(
        default=None,
        ge=0,
        description="Order in UI listings; defaults to next available order",
    )


class FeedbackCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    color: str | None = Field(
        default=None,
        pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
    )
    icon: str | None = Field(default=None, max_length=50)
    keywords: list[str] | None = Field(default=None)
    is_active: bool | None = Field(default=None)
    display_order: int | None = Field(default=None, ge=0)


class FeedbackCategoryRead(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    slug: str
    description: str
    color: str
    icon: str | None = None
    keywords: list[str] = Field(default_factory=list)
    is_uncategorized: bool
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedbackCategorySeedRequest(BaseModel):
    industry: str | None = Field(
        default=None,
        description="Target industry to seed presets from. Defaults to the workspace's configured industry.",
    )
    force_reset: bool = Field(
        default=False,
        description="If true, archives existing categories and seeds fresh presets.",
    )


class FeedbackCategoryReorderItem(BaseModel):
    id: UUID
    display_order: int = Field(..., ge=0)


class FeedbackCategoryReorderRequest(BaseModel):
    items: list[FeedbackCategoryReorderItem]
