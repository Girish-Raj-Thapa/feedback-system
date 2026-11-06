"""
Services package for Feedback feature.
"""

from app.features.feedback.services.alert_evaluator import AlertEvaluatorService
from app.features.feedback.services.alert_rules import AlertRuleService
from app.features.feedback.services.categories import (
    FeedbackCategoryService,
    slugify,
)
from app.features.feedback.services.forms import FormService
from app.features.feedback.services.insights import InsightsService
from app.features.feedback.services.submissions import SubmissionService

# Alias for feature-level service orchestration
FeedbackService = FeedbackCategoryService

__all__ = [
    "AlertEvaluatorService",
    "AlertRuleService",
    "FeedbackCategoryService",
    "FeedbackService",
    "FormService",
    "InsightsService",
    "SubmissionService",
    "slugify",
]
