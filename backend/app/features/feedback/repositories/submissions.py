"""
Repository layer for Feedback Submissions.
"""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.feedback.models.submissions import FeedbackSubmission


class SubmissionRepository:
    """
    Data access operations for Feedback Submissions.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, submission: FeedbackSubmission) -> FeedbackSubmission:
        """
        Persist a new feedback submission record.
        """
        self.session.add(submission)
        await self.session.flush()
        return submission

    async def get_by_id(self, submission_id: UUID) -> FeedbackSubmission | None:
        """
        Fetch submission by ID.
        """
        return await self.session.get(FeedbackSubmission, submission_id)

    async def list_by_workspace(
        self,
        workspace_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[FeedbackSubmission], int]:
        """
        List submissions for a workspace with pagination.
        """
        conditions = [FeedbackSubmission.workspace_id == workspace_id]
        stmt = (
            select(FeedbackSubmission)
            .where(*conditions)
            .order_by(FeedbackSubmission.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        count_stmt = (
            select(func.count()).select_from(FeedbackSubmission).where(*conditions)
        )

        result = await self.session.execute(stmt)
        count_result = await self.session.execute(count_stmt)

        return result.scalars().all(), count_result.scalar_one()

    async def update(
        self,
        submission: FeedbackSubmission,
        status: str | None = None,
        category_id: UUID | None = None,
    ) -> FeedbackSubmission:
        """
        Update an existing submission record.
        """
        if status is not None:
            submission.status = status
        if category_id is not None:
            submission.category_id = category_id
        await self.session.flush()
        return submission

    async def list_by_customer_email(
        self,
        workspace_id: UUID,
        customer_email: str,
        limit: int = 50,
    ) -> Sequence[FeedbackSubmission]:
        """
        Fetch submissions from a specific customer email within a workspace.
        """
        stmt = (
            select(FeedbackSubmission)
            .where(
                FeedbackSubmission.workspace_id == workspace_id,
                FeedbackSubmission.customer_email.ilike(customer_email.strip()),
            )
            .order_by(FeedbackSubmission.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
