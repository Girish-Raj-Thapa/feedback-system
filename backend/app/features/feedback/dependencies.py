"""
FastAPI dependency providers for Feedback feature.
"""

from typing import Annotated

from fastapi import Depends

from app.core.dependencies import DBSession
from app.features.feedback.services import FeedbackService


def get_feedback_service(session: DBSession) -> FeedbackService:
    return FeedbackService(session)


FeedbackServiceDep = Annotated[FeedbackService, Depends(get_feedback_service)]
