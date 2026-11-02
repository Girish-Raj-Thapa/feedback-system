"""
Service layer for Feedback Submissions.
Validates public incoming feedback submissions against form rules and returns tailored outcome screens.
"""

import re
from collections.abc import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.forms import FormRepository
from app.features.feedback.repositories.submissions import SubmissionRepository
from app.features.feedback.schemas.submissions import (
    CustomerHistoryRead,
    FeedbackOutcomeResponse,
    FeedbackSubmissionCreate,
    FeedbackSubmissionRead,
    FeedbackSubmissionResponse,
    FeedbackSubmissionUpdate,
)


class SubmissionService:
    """
    Business logic for receiving and managing customer feedback submissions.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.submission_repo = SubmissionRepository(session)
        self.form_repo = FormRepository(session)
        self.category_repo = FeedbackCategoryRepository(session)

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
        category_label: str | None = (
            payload.category_pill_label.strip()
            if payload.category_pill_label
            else None
        )
        if category_label and form.category_pills:
            cleaned_target = category_label.lower()
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

        # 3b. $0 Auto Keyword Categorization (pure in-memory keyword scan if no pill selected)
        if category_id is None and payload.comment:
            categories = await self.category_repo.list_active(ws.id)
            comment_lower = payload.comment.lower()
            best_cat = None
            max_matches = 0

            for cat in categories:
                if cat.is_uncategorized:
                    continue
                match_count = 0
                for kw in cat.keywords or []:
                    if not kw or not isinstance(kw, str):
                        continue
                    kw_clean = kw.strip().lower()
                    if not kw_clean:
                        continue
                    pattern = rf"\b{re.escape(kw_clean)}\b"
                    if re.search(pattern, comment_lower):
                        match_count += 1

                if match_count > max_matches:
                    max_matches = match_count
                    best_cat = cat

            if best_cat is not None:
                category_id = best_cat.id
                if not category_label:
                    category_label = best_cat.name

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

        # 5b. Rule-based / Deterministic Sentiment Tagging ($0 LLM-free)
        sentiment: str | None = None
        if payload.rating is not None:
            if form.rating_scale_type in ("5_star", "5_emoji"):
                if payload.rating >= 4:
                    sentiment = "positive"
                elif payload.rating == 3:
                    sentiment = "neutral"
                else:
                    sentiment = "negative"
            elif form.rating_scale_type == "1_10_numeric":
                if payload.rating >= 7:
                    sentiment = "positive"
                elif payload.rating in (5, 6):
                    sentiment = "neutral"
                else:
                    sentiment = "negative"
        elif payload.comment:
            comment_lower = payload.comment.lower()
            pos_words = {
                "great",
                "love",
                "awesome",
                "excellent",
                "amazing",
                "good",
                "fast",
                "helpful",
                "perfect",
                "fantastic",
            }
            neg_words = {
                "terrible",
                "awful",
                "bad",
                "slow",
                "broken",
                "worst",
                "bug",
                "hate",
                "useless",
                "crash",
                "horrible",
            }
            pos_count = sum(
                1 for w in pos_words if re.search(rf"\b{w}\b", comment_lower)
            )
            neg_count = sum(
                1 for w in neg_words if re.search(rf"\b{w}\b", comment_lower)
            )
            if pos_count > neg_count:
                sentiment = "positive"
            elif neg_count > pos_count:
                sentiment = "negative"
            else:
                sentiment = "neutral"

        # 6. Save Submission Record
        submission = FeedbackSubmission(
            workspace_id=ws.id,
            form_id=form.id,
            category_id=category_id,
            category_pill_label=category_label,
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
            sentiment=sentiment,
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
            sentiment=submission.sentiment,
            created_at=submission.created_at,
            outcome=outcome,
        )

    async def list_submissions(
        self,
        workspace_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[FeedbackSubmission], int]:
        """
        List feedback submissions for a workspace with pagination.
        """
        ws = await self.session.get(Workspace, workspace_id)
        if not ws or ws.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )
        return await self.submission_repo.list_by_workspace(
            workspace_id=workspace_id,
            limit=limit,
            offset=offset,
        )

    async def get_submission(
        self,
        workspace_id: UUID,
        submission_id: UUID,
    ) -> FeedbackSubmission:
        """
        Get a specific feedback submission by ID, enforcing workspace tenant isolation.
        """
        submission = await self.submission_repo.get_by_id(submission_id)
        if not submission or submission.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback submission not found",
            )
        return submission

    async def update_submission(
        self,
        workspace_id: UUID,
        submission_id: UUID,
        payload: FeedbackSubmissionUpdate,
    ) -> FeedbackSubmission:
        """
        Update submission status (e.g. reviewed, archived) with tenant isolation.
        """
        submission = await self.get_submission(workspace_id, submission_id)
        if payload.status is not None:
            submission.status = payload.status
        if payload.category_id is not None:
            submission.category_id = payload.category_id

        await self.session.commit()
        await self.session.refresh(submission)
        return submission

    async def get_customer_history(
        self,
        workspace_id: UUID,
        submission_id: UUID,
    ) -> CustomerHistoryRead:
        """
        Retrieve all submissions and summary metrics for the customer who submitted this feedback.
        """
        submission = await self.get_submission(workspace_id, submission_id)
        if not submission.customer_email:
            return CustomerHistoryRead(
                customer_email=None,
                customer_name=submission.customer_name,
                total_submissions=1,
                avg_rating=(
                    float(submission.rating)
                    if submission.rating is not None
                    else None
                ),
                submissions=[FeedbackSubmissionRead.model_validate(submission)],
            )

        customer_submissions = await self.submission_repo.list_by_customer_email(
            workspace_id=workspace_id,
            customer_email=submission.customer_email,
        )

        ratings = [
            s.rating for s in customer_submissions if s.rating is not None
        ]
        avg_rating = (
            round(sum(ratings) / len(ratings), 2) if ratings else None
        )

        # Pick customer name from the latest submission that had a name
        customer_name = submission.customer_name
        if not customer_name:
            for s in customer_submissions:
                if s.customer_name:
                    customer_name = s.customer_name
                    break

        return CustomerHistoryRead(
            customer_email=submission.customer_email,
            customer_name=customer_name,
            total_submissions=len(customer_submissions),
            avg_rating=avg_rating,
            submissions=[
                FeedbackSubmissionRead.model_validate(s)
                for s in customer_submissions
            ],
        )
