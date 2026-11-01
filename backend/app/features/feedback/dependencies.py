"""
FastAPI dependency providers for Feedback feature.
"""

from typing import Annotated

from fastapi import Depends

from app.core.dependencies import DBSession
from app.features.feedback.services import FeedbackService, FormService


def get_feedback_service(session: DBSession) -> FeedbackService:
    return FeedbackService(session)


def get_form_service(session: DBSession) -> FormService:
    return FormService(session)


FeedbackServiceDep = Annotated[FeedbackService, Depends(get_feedback_service)]
FormServiceDep = Annotated[FormService, Depends(get_form_service)]
