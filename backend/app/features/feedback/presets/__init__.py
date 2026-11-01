"""
Presets package for Feedback feature.
"""

from app.features.feedback.presets.categories import (
    INDUSTRY_CATEGORY_PRESETS,
    get_preset_categories,
)

__all__ = ["INDUSTRY_CATEGORY_PRESETS", "get_preset_categories"]
