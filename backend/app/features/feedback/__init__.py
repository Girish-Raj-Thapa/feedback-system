"""
Feedback Feature Package: Categories, Forms, and Submissions.
"""

from app.features.feedback.models import FeedbackCategory
from app.features.feedback.presets import (
    INDUSTRY_CATEGORY_PRESETS,
    get_preset_categories,
)

__all__ = [
    "FeedbackCategory",
    "INDUSTRY_CATEGORY_PRESETS",
    "get_preset_categories",
]
