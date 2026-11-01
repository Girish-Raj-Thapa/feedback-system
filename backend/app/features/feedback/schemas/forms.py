"""
Pydantic schemas for Feedback Forms and Widget Configurations.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryPillSchema(BaseModel):
    id: str = Field(..., description="Unique pill ID within the form")
    label: str = Field(..., min_length=1, max_length=100)
    category_id: UUID | None = Field(
        default=None,
        description="Optional foreign key to a FeedbackCategory for automatic deterministic categorization",
    )


class CustomQuestionSchema(BaseModel):
    id: str = Field(..., description="Unique question ID")
    label: str = Field(..., min_length=1, max_length=255)
    type: str = Field(
        default="single_choice",
        description="Question type: 'single_choice', 'multi_choice', or 'text'",
    )
    options: list[str] = Field(
        default_factory=list,
        description="Choice options if single_choice or multi_choice",
    )
    required: bool = Field(default=False)


class FormCreate(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=255, description="Internal form name"
    )
    slug: str | None = Field(
        default=None,
        max_length=100,
        description="URL slug. If omitted, will be auto-generated from name.",
    )
    template_type: str | None = Field(
        default=None,
        description="Starter template: 'saas', 'ecommerce', 'subscription', 'service', 'general'",
    )
    title: str | None = Field(default=None, max_length=255)
    subtitle: str | None = Field(default=None)
    rating_scale_type: str | None = Field(
        default=None,
        description="'5_star', '5_emoji', or '1_10_numeric'",
    )
    rating_required: bool | None = Field(default=None)
    category_pills: list[dict] | None = Field(default=None)
    custom_questions: list[dict] | None = Field(default=None)
    open_feedback_prompt: str | None = Field(default=None, max_length=255)
    open_feedback_placeholder: str | None = Field(default=None)
    contact_field_mode: str | None = Field(
        default=None,
        description="'hidden', 'optional', or 'required'",
    )
    theme_config: dict | None = Field(default=None)
    outcome_screen: dict | None = Field(default=None)
    widget_settings: dict | None = Field(default=None)
    allowed_domains: list[str] | None = Field(default=None)


class FormUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=100)
    is_active: bool | None = Field(default=None)
    title: str | None = Field(default=None, max_length=255)
    subtitle: str | None = Field(default=None)
    rating_scale_type: str | None = Field(default=None)
    rating_required: bool | None = Field(default=None)
    category_pills: list[dict] | None = Field(default=None)
    custom_questions: list[dict] | None = Field(default=None)
    open_feedback_prompt: str | None = Field(default=None, max_length=255)
    open_feedback_placeholder: str | None = Field(default=None)
    contact_field_mode: str | None = Field(default=None)
    theme_config: dict | None = Field(default=None)
    outcome_screen: dict | None = Field(default=None)
    widget_settings: dict | None = Field(default=None)
    allowed_domains: list[str] | None = Field(default=None)


class FormRead(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    slug: str
    is_active: bool
    template_type: str | None = None
    title: str
    subtitle: str | None = None
    rating_scale_type: str
    rating_required: bool
    category_pills: list[dict]
    custom_questions: list[dict]
    open_feedback_prompt: str
    open_feedback_placeholder: str | None = None
    contact_field_mode: str
    theme_config: dict
    outcome_screen: dict
    widget_settings: dict
    allowed_domains: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicFormRead(BaseModel):
    """
    Public presentation of a form for embed widgets and standalone hosted pages.
    Omits sensitive internal fields and includes workspace branding.
    """

    id: UUID
    workspace_slug: str
    workspace_name: str
    name: str
    slug: str
    is_active: bool
    title: str
    subtitle: str | None = None
    rating_scale_type: str
    rating_required: bool
    category_pills: list[dict]
    custom_questions: list[dict]
    open_feedback_prompt: str
    open_feedback_placeholder: str | None = None
    contact_field_mode: str
    theme_config: dict
    outcome_screen: dict
    widget_settings: dict

    model_config = ConfigDict(from_attributes=True)


class FormDuplicateRequest(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Optional custom name for duplicated form. Defaults to '<original> (Copy)'.",
    )
