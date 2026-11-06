"""
FastAPI dependency providers for Feedback feature.
"""

from typing import Annotated

from fastapi import Depends

from app.core.dependencies import DBSession
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.submissions import SubmissionRepository
from app.features.feedback.services import (
    AlertRuleService,
    FeedbackService,
    FormService,
    InsightsService,
    SubmissionService,
)


def get_feedback_service(session: DBSession) -> FeedbackService:
    return FeedbackService(session)


def get_form_service(session: DBSession) -> FormService:
    return FormService(session)


def get_submission_service(session: DBSession) -> SubmissionService:
    return SubmissionService(session)


def get_insights_service(session: DBSession) -> InsightsService:
    return InsightsService(
        session=session,
        submission_repo=SubmissionRepository(session),
        category_repo=FeedbackCategoryRepository(session),
    )


def get_alert_rule_service(session: DBSession) -> AlertRuleService:
    return AlertRuleService(session)


FeedbackServiceDep = Annotated[FeedbackService, Depends(get_feedback_service)]
AlertRuleServiceDep = Annotated[AlertRuleService, Depends(get_alert_rule_service)]
FormServiceDep = Annotated[FormService, Depends(get_form_service)]
SubmissionServiceDep = Annotated[SubmissionService, Depends(get_submission_service)]
InsightsServiceDep = Annotated[InsightsService, Depends(get_insights_service)]
