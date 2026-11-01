"""
Services package for Feedback feature.
"""

from app.features.feedback.services.categories import (
    FeedbackCategoryService,
    slugify,
)
from app.features.feedback.services.forms import FormService

# Alias for feature-level service orchestration
FeedbackService = FeedbackCategoryService

__all__ = ["FeedbackCategoryService", "FeedbackService", "FormService", "slugify"]
