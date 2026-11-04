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
from app.features.feedback.models.forms import Form
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
        public_review_url = outcome_config.get("public_review_url") or outcome_config.get("high_score_cta_url")
        public_review_text = (
            outcome_config.get("public_review_text")
            or outcome_config.get("high_score_cta_text")
            or "Share public review"
        )

        if is_high_score:
            outcome_title = (
                outcome_config.get("high_score_title") or "Thank you for your feedback!"
            )
            outcome_message = (
                outcome_config.get("high_score_message")
                or "We truly appreciate you taking the time to share your experience."
            )
            cta_text = outcome_config.get("high_score_cta_text") or "Share Your Review"
            cta_url = outcome_config.get("high_score_cta_url") or public_review_url
            support_text = None
            support_url = None
        else:
            outcome_title = (
                outcome_config.get("low_score_title")
                or "We're sorry we missed the mark"
            )
            outcome_message = (
                outcome_config.get("low_score_message")
                or "Our team takes this seriously and is here to make things right."
            )
            cta_text = None
            cta_url = None
            support_text = outcome_config.get("low_score_support_text") or "Contact Support / Get Help"
            support_url = outcome_config.get("low_score_support_url")

        outcome = FeedbackOutcomeResponse(
            title=outcome_title,
            message=outcome_message,
            is_high_score=is_high_score,
            cta_text=cta_text,
            cta_url=cta_url,
            support_text=support_text if support_url else None,
            support_url=support_url,
            public_review_text=public_review_text if public_review_url else None,
            public_review_url=public_review_url,
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
        status_filter: str | None = None,
        category_id: UUID | None = None,
        sentiment: str | None = None,
        query: str | None = None,
    ) -> tuple[Sequence[FeedbackSubmission], int]:
        """
        List feedback submissions for a workspace with pagination and optional filters.
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
            status=status_filter,
            category_id=category_id,
            sentiment=sentiment,
            query=query,
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
        Update submission status (e.g. in_progress, resolved, archived) or category/sentiment with tenant isolation.
        """
        submission = await self.get_submission(workspace_id, submission_id)
        if payload.status is not None:
            submission.status = payload.status
        if payload.category_id is not None:
            submission.category_id = payload.category_id
            cat = await self.category_repo.get_by_id(
                workspace_id, payload.category_id
            )
            if cat:
                submission.category_pill_label = cat.name
        if payload.sentiment is not None:
            submission.sentiment = payload.sentiment

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

    async def load_sample_data(self, workspace_id: UUID) -> int:
        """
        Seeds 6 realistic customer feedback responses across diverse categories and sentiments.
        Enables instant exploration of the Decision Insights & Score Drivers engine.
        """
        ws = await self.session.get(Workspace, workspace_id)
        if not ws or ws.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )

        # 1. Ensure an active form exists
        forms = await self.form_repo.list_active(workspace_id)
        if not forms:
            default_form = Form(
                workspace_id=workspace_id,
                name="Product Feedback",
                title="Product Feedback",
                slug="product-feedback",
                subtitle="Share your thoughts, suggestions, and feedback with our team.",
                rating_scale_type="5_star",
                rating_required=True,
                is_active=True,
            )
            self.session.add(default_form)
            await self.session.flush()
            target_form_id = default_form.id
        else:
            target_form_id = forms[0].id

        # 2. Check if sample submissions are already present
        existing = await self.submission_repo.list_sample_submissions(workspace_id)
        if len(existing) >= 6:
            return len(existing)

        # 3. Fetch workspace categories to link realistically
        categories = await self.category_repo.list_active(workspace_id)

        def match_cat(keywords: list[str]):
            for cat in categories:
                cat_slug = cat.slug.lower()
                cat_name = cat.name.lower()
                for kw in keywords:
                    if kw in cat_slug or kw in cat_name:
                        return cat
            return None

        cat_ux = match_cat(["ease", "ux", "design", "product"])
        cat_pricing = match_cat(["pric", "bill", "cost"])
        cat_support = match_cat(["support", "help", "service"])
        cat_bug = match_cat(["bug", "qual", "issue", "error"])
        cat_feat = match_cat(["feat", "request", "integration"])
        cat_speed = match_cat(["speed", "perf", "fast"])

        sample_definitions = [
            {
                "rating": 5,
                "rating_scale_type": "5_star",
                "comment": "Super fast setup and intuitive UI! The score drivers dashboard made prioritizing our sprint backlog 10x easier.",
                "sentiment": "positive",
                "status": "new",
                "customer_email": "sarah.jenkins@acme.com",
                "customer_name": "Sarah Jenkins",
                "category": cat_ux,
                "role": "VP Product",
            },
            {
                "rating": 2,
                "rating_scale_type": "5_star",
                "comment": "Pricing is way too steep for early-stage startups and solopreneurs. Please offer a lower tier.",
                "sentiment": "negative",
                "status": "new",
                "customer_email": "marcus.vance@techfounder.io",
                "customer_name": "Marcus Vance",
                "category": cat_pricing,
                "role": "Founder",
            },
            {
                "rating": 5,
                "rating_scale_type": "5_star",
                "comment": "Customer support responded in 5 minutes and solved our domain configuration issue immediately.",
                "sentiment": "positive",
                "status": "resolved",
                "customer_email": "elena.rostova@designflow.co",
                "customer_name": "Elena Rostova",
                "category": cat_support,
                "role": "Lead Designer",
            },
            {
                "rating": 1,
                "rating_scale_type": "5_star",
                "comment": "Hit a 500 error when attempting to export large CSV datasets. Needs fixing ASAP.",
                "sentiment": "negative",
                "status": "in_progress",
                "customer_email": "david.kim@hypergrowth.org",
                "customer_name": "David Kim",
                "category": cat_bug,
                "role": "Data Analyst",
            },
            {
                "rating": 3,
                "rating_scale_type": "5_star",
                "comment": "Overall clean experience, but would love a native Slack or Linear webhook integration.",
                "sentiment": "neutral",
                "status": "new",
                "customer_email": "alex.chen@innovate.dev",
                "customer_name": "Alex Chen",
                "category": cat_feat,
                "role": "Staff Engineer",
            },
            {
                "rating": 5,
                "rating_scale_type": "5_star",
                "comment": "Page loading speed is lightning fast even with dozens of feedback cards on screen.",
                "sentiment": "positive",
                "status": "resolved",
                "customer_email": "claire.dupont@saasmetrics.app",
                "customer_name": "Claire Dupont",
                "category": cat_speed,
                "role": "Growth Marketer",
            },
        ]

        created_count = 0
        for item in sample_definitions:
            cat = item["category"]
            cat_id = cat.id if cat else None
            cat_label = cat.name if cat else None

            sub = FeedbackSubmission(
                workspace_id=workspace_id,
                form_id=target_form_id,
                category_id=cat_id,
                category_pill_label=cat_label,
                rating=item["rating"],
                rating_scale_type=item["rating_scale_type"],
                comment=item["comment"],
                custom_answers={},
                customer_email=item["customer_email"],
                customer_name=item["customer_name"],
                customer_metadata={
                    "is_sample": True,
                    "source": "Sample Feedback",
                    "role": item["role"],
                },
                status=item["status"],
                sentiment=item["sentiment"],
            )
            self.session.add(sub)
            created_count += 1

        await self.session.commit()
        return created_count

    async def clear_sample_data(self, workspace_id: UUID) -> int:
        """
        Removes all sample/demo feedback responses from a workspace.
        """
        ws = await self.session.get(Workspace, workspace_id)
        if not ws or ws.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )

        deleted = await self.submission_repo.delete_sample_submissions(workspace_id)
        await self.session.commit()
        return deleted
