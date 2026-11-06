"""
Service layer for Alert Rule evaluation.
Evaluates incoming feedback submissions against active workspace alert rules and form scopes.
"""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.repositories.alert_rules import AlertRuleRepository


class AlertEvaluatorService:
    """
    Evaluates customer feedback submissions against workspace alert rules.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rule_repo = AlertRuleRepository(session)

    async def find_matching_rules(
        self,
        submission: FeedbackSubmission,
        workspace_id: UUID,
    ) -> list[AlertRule]:
        """
        Fetch all active rules for the workspace and return only those that match
        the submission's form and rating/sentiment criteria.
        """
        active_rules = await self.rule_repo.list_active_for_evaluation(
            workspace_id
        )
        matched_rules: list[AlertRule] = []

        for rule in active_rules:
            if self._matches(submission, rule):
                matched_rules.append(rule)

        return matched_rules

    def _matches(
        self,
        submission: FeedbackSubmission,
        rule: AlertRule,
    ) -> bool:
        """
        Evaluate rule match against submission attributes.
        """
        # 1. Rule must be active and have a healthy connection
        if not rule.is_active or not rule.connection:
            return False

        if (
            not rule.connection.is_active
            or rule.connection.health_status == "revoked"
        ):
            return False

        # 2. Form scope filter
        # If form_ids is populated, submission must be from one of the allowed forms
        if rule.form_ids and len(rule.form_ids) > 0:
            allowed_forms = {str(fid) for fid in rule.form_ids}
            if str(submission.form_id) not in allowed_forms:
                return False

        # 3. Trigger condition filter
        trigger_type = (rule.trigger_type or "detractors_only").lower()

        if trigger_type == "all_feedback":
            return True

        if trigger_type == "detractors_only":
            return self._is_detractor(submission)

        # Unknown trigger types default to False for safety
        return False

    @staticmethod
    def _is_detractor(submission: FeedbackSubmission) -> bool:
        """
        A submission is considered a detractor if its normalized rating is low (<= 3/5 or <= 6/10)
        or if its sentiment was tagged as negative.
        """
        rating = submission.rating
        scale = submission.rating_scale_type or "5_star"

        if rating is not None:
            if scale in ("5_star", "5_emoji"):
                return rating <= 3
            if scale == "1_10_numeric":
                return rating <= 6
            return rating <= 3

        # Unrated submissions with open text
        return submission.sentiment == "negative"

