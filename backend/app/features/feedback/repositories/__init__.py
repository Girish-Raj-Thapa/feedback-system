"""
Repositories package for Feedback feature.
"""

from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.forms import FormRepository

__all__ = ["FeedbackCategoryRepository", "FormRepository"]
