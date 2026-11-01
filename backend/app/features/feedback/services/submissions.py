"""
Service layer for Feedback Submissions.
Validates public incoming feedback submissions against form rules and returns tailored outcome screens.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.repositories.forms import FormRepository
from app.features.feedback.repositories.submissions import SubmissionRepository
from app.features.feedback.schemas.submissions import (
    FeedbackOutcomeResponse,
    FeedbackSubmissionCreate,
    FeedbackSubmissionResponse,
)


class SubmissionService:
    """
    Business logic for receiving and managing customer feedback submissions.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.submission_repo = SubmissionRepository(session)
        self.form_repo = FormRepository(session)

    async def submit_feedback(
        self,
        workspace_slug: str,
        form_slug: str,
        payload: FeedbackSubmissionCreate,
    ) -> FeedbackSubmissionResponse:
        """
        Public submission of feedback from a hosted page or embedded widget.
        """
        row = await self.form_repo.get_public_form(workspace_slug, form_slug)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found or is currently inactive",
            )
        form, ws = row

        # 1. Validate Rating
        if form.rating_required and payload.rating is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Rating is required for this form",
            )

        if payload.rating is not None:
            if form.rating_scale_type in ("5_star", "5_emoji"):
                if not (1 <= payload.rating <= 5):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Rating must be an integer between 1 and 5",
                    )
            elif form.rating_scale_type == "1_10_numeric":
                if not (1 <= payload.rating <= 10):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Rating must be an integer between 1 and 10",
                    )

        # 2. Validate Contact Field
        if form.contact_field_mode == "required" and not payload.customer_email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Customer email is required",
            )

        # 3. Deterministic Category Mapping from Category Pill
        category_id: UUID | None = None
        if payload.category_pill_label and form.category_pills:
            cleaned_target = payload.category_pill_label.strip().lower()
            for pill in form.category_pills:
                if (
                    isinstance(pill, dict)
                    and pill.get("label", "").strip().lower() == cleaned_target
                ):
                    raw_cat_id = pill.get("category_id")
                    if raw_cat_id:
                        try:
                            category_id = UUID(str(raw_cat_id))
                        except (ValueError, TypeError):
                            category_id = None
                    break

        # 4. Validate Required Custom Questions
        if form.custom_questions:
            for q in form.custom_questions:
                if isinstance(q, dict) and q.get("required"):
                    q_id = str(q.get("id"))
                    ans = payload.custom_answers.get(q_id)
                    if (
                        ans is None
                        or ans == ""
                        or (isinstance(ans, list) and len(ans) == 0)
                    ):
                        q_label = q.get("label", "Question")
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Question '{q_label}' is required",
                        )

        # 5. Tailored Outcome Screen calculation
        is_high_score = True
        if payload.rating is not None:
            if form.rating_scale_type in ("5_star", "5_emoji"):
                is_high_score = payload.rating >= 4
            elif form.rating_scale_type == "1_10_numeric":
                is_high_score = payload.rating >= 7

        outcome_config = form.outcome_screen or {}
        if is_high_score:
            outcome_title = (
                outcome_config.get("high_score_title") or "Thank you for your feedback!"
            )
            outcome_message = (
                outcome_config.get("high_score_message")
                or "We truly appreciate you taking the time to share your experience."
            )
            cta_text = outcome_config.get("high_score_cta_text")
            cta_url = outcome_config.get("high_score_cta_url")
        else:
            outcome_title = (
                outcome_config.get("low_score_title")
                or "We're sorry we missed the mark"
            )
            outcome_message = (
                outcome_config.get("low_score_message")
                or "Our team takes this seriously and will look into what went wrong."
            )
            cta_text = None
            cta_url = None

        outcome = FeedbackOutcomeResponse(
            title=outcome_title,
            message=outcome_message,
            is_high_score=is_high_score,
            cta_text=cta_text,
            cta_url=cta_url,
        )

        # 6. Save Submission Record
        submission = FeedbackSubmission(
            workspace_id=ws.id,
            form_id=form.id,
            category_id=category_id,
            category_pill_label=(
                payload.category_pill_label.strip()
                if payload.category_pill_label
                else None
            ),
            rating=payload.rating,
            rating_scale_type=form.rating_scale_type,
            comment=payload.comment.strip() if payload.comment else None,
            custom_answers=payload.custom_answers,
            customer_email=(
                str(payload.customer_email).strip().lower()
                if payload.customer_email
                else None
            ),
            customer_name=(
                payload.customer_name.strip() if payload.customer_name else None
            ),
            customer_metadata=payload.customer_metadata,
            status="new",
        )

        await self.submission_repo.create(submission)
        await self.session.commit()
        await self.session.refresh(submission)

        return FeedbackSubmissionResponse(
            id=submission.id,
            workspace_slug=ws.slug,
            form_slug=form.slug,
            rating=submission.rating,
            rating_scale_type=submission.rating_scale_type,
            category_pill_label=submission.category_pill_label,
            category_id=submission.category_id,
            status=submission.status,
            created_at=submission.created_at,
            outcome=outcome,
        )
