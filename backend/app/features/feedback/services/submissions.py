"""
Service layer for Feedback Submissions.
Validates public incoming feedback submissions against form rules and returns tailored outcome screens.
"""

import csv
import hashlib
import io
import json
import re
from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.redis import get_redis
from app.features.auth.models import Workspace
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.models.forms import Form
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.forms import FormRepository
from app.features.feedback.repositories.submissions import SubmissionRepository
from app.features.feedback.schemas.submissions import (
    CustomerHistoryRead,
    FeedbackImportErrorItem,
    FeedbackImportRequest,
    FeedbackImportResponse,
    FeedbackImportRow,
    FeedbackOutcomeResponse,
    FeedbackSubmissionCreate,
    FeedbackSubmissionRead,
    FeedbackSubmissionResponse,
    FeedbackSubmissionUpdate,
)
from app.features.feedback.services.form_token import FormTokenService
from app.features.feedback.services.turnstile import TurnstileService
from app.features.feedback.utils import is_domain_allowed

logger = get_logger("app.features.feedback.services.submissions")

_POSITIVE_SENTIMENT_WORDS = frozenset(
    {
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
)

_NEGATIVE_SENTIMENT_WORDS = frozenset(
    {
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
)

_CSV_COLUMN_ALIASES: dict[str, str] = {
    "comment": "comment",
    "feedback": "comment",
    "message": "comment",
    "text": "comment",
    "body": "comment",
    "notes": "comment",
    "note": "comment",
    "review": "comment",
    "response": "comment",
    "description": "comment",
    "rating": "rating",
    "score": "rating",
    "stars": "rating",
    "nps": "rating",
    "rating_scale_type": "rating_scale_type",
    "scale_type": "rating_scale_type",
    "scale": "rating_scale_type",
    "category": "category_name",
    "category_name": "category_name",
    "topic": "category_name",
    "tag": "category_name",
    "label": "category_name",
    "theme": "category_name",
    "sentiment": "sentiment",
    "tone": "sentiment",
    "status": "status",
    "state": "status",
    "customer_email": "customer_email",
    "email": "customer_email",
    "user_email": "customer_email",
    "contact_email": "customer_email",
    "customer_name": "customer_name",
    "name": "customer_name",
    "user_name": "customer_name",
    "author": "customer_name",
    "customer": "customer_name",
    "source": "source",
    "channel": "source",
    "ref": "source",
    "page_url": "page_url",
    "url": "page_url",
    "page": "page_url",
    "plan_tier": "plan_tier",
    "plan": "plan_tier",
    "tier": "plan_tier",
    "created_at": "created_at",
    "date": "created_at",
    "timestamp": "created_at",
    "submitted_at": "created_at",
}

_STATUS_ALIASES: dict[str, str] = {
    "new": "new",
    "open": "new",
    "in_progress": "in_progress",
    "in progress": "in_progress",
    "in-progress": "in_progress",
    "triaged": "in_progress",
    "resolved": "resolved",
    "done": "resolved",
    "closed": "resolved",
    "archived": "archived",
}

_MAX_IMPORT_ROWS = 500


class SubmissionService:
    """
    Business logic for receiving and managing customer feedback submissions.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.submission_repo = SubmissionRepository(session)
        self.form_repo = FormRepository(session)
        self.category_repo = FeedbackCategoryRepository(session)

    def _build_outcome_response(
        self,
        form: Form,
        rating: int | None,
    ) -> FeedbackOutcomeResponse:
        is_high_score = True
        if rating is not None:
            if form.rating_scale_type in ("5_star", "5_emoji"):
                is_high_score = rating >= 4
            elif form.rating_scale_type == "1_10_numeric":
                is_high_score = rating >= 7

        outcome_config = form.outcome_screen or {}
        public_review_url = outcome_config.get(
            "public_review_url"
        ) or outcome_config.get("high_score_cta_url")
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
            support_text = (
                outcome_config.get("low_score_support_text")
                or "Contact Support / Get Help"
            )
            support_url = outcome_config.get("low_score_support_url")

        return FeedbackOutcomeResponse(
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

    async def submit_feedback(
        self,
        workspace_slug: str,
        form_slug: str,
        payload: FeedbackSubmissionCreate,
        origin_or_referer: str | None = None,
        client_ip: str | None = None,
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

        # 0. Validate Allowed Domains (if configured)
        if form.allowed_domains and not is_domain_allowed(
            form.allowed_domains, origin_or_referer
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Domain is not authorized to submit feedback to this form",
            )

        # 0b. Validate Cryptographic HMAC Form Token & Replay Nonce
        jti: str | None = None
        redis = get_redis()
        if payload.form_token:
            claims = FormTokenService.verify_form_token(payload.form_token, form.id)
            jti = str(claims["jti"])

            # Idempotency check: client double-click or network retry
            existing_sub_id = await FormTokenService.get_idempotent_submission_id(
                redis, jti
            )
            if existing_sub_id:
                existing_sub = await self.submission_repo.get_by_id(
                    UUID(existing_sub_id)
                )
                if existing_sub:
                    outcome = self._build_outcome_response(form, existing_sub.rating)
                    return FeedbackSubmissionResponse(
                        id=existing_sub.id,
                        workspace_slug=ws.slug,
                        form_slug=form.slug,
                        rating=existing_sub.rating,
                        rating_scale_type=existing_sub.rating_scale_type,
                        category_pill_label=existing_sub.category_pill_label,
                        category_id=existing_sub.category_id,
                        status=existing_sub.status,
                        sentiment=existing_sub.sentiment,
                        created_at=existing_sub.created_at,
                        outcome=outcome,
                    )

            # Atomic single-use claim
            claimed = await FormTokenService.claim_nonce_atomic(redis, jti)
            if not claimed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Form token has already been consumed or replay detected.",
                )

        # 0c. Cloudflare Turnstile Anti-Bot Verification & Lane Classification
        challenge_result, trust_level = await TurnstileService.verify_challenge(
            payload.turnstile_token,
            client_ip=client_ip,
        )
        if trust_level == "unverified" or challenge_result in ("failed", "unavailable"):
            initial_status = "quarantined"
            lane = "lane_c"
        else:
            initial_status = "new"
            lane = "lane_a"

        # 1. Validate Rating
        if form.rating_required and payload.rating is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Rating is required for this form",
            )

        if payload.rating is not None:
            rating_error = self._validate_rating_range(
                payload.rating, form.rating_scale_type
            )
            if rating_error:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=rating_error,
                )

        # 2. Validate Contact Field
        if form.contact_field_mode == "required" and not payload.customer_email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
            best_cat = self._match_category_by_keywords(categories, payload.comment)
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
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail=f"Question '{q_label}' is required",
                        )

        # 5. Tailored Outcome Screen calculation
        outcome = self._build_outcome_response(form, payload.rating)

        # 5b. Rule-based / Deterministic Sentiment Tagging ($0 LLM-free)
        sentiment = self._infer_sentiment(
            rating=payload.rating,
            scale_type=form.rating_scale_type,
            comment=payload.comment,
        )

        # 6. Save Submission Record
        raw_content = f"{payload.rating}:{payload.comment or ''}:{payload.customer_email or ''}"
        content_hash = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()

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
            status=initial_status,
            sentiment=sentiment,
            token_jti=jti,
            trust_level=trust_level,
            lane=lane,
            source=(
                str(payload.customer_metadata.get("source") or "hosted").strip()[:30]
                or "hosted"
            ),
            content_hash=content_hash,
            challenge_result=challenge_result,
            spam_score=0,
            spam_reasons=[],
            triage_state="pending",
        )

        allowed = await self.submission_repo.consume_submission_quota(ws.id)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Monthly feedback limit reached ({ws.monthly_submission_limit} responses). "
                    "Upgrade to Pro to collect up to 2,500 monthly responses."
                ),
            )

        await self.submission_repo.create(submission)
        await self.session.commit()
        await self.session.refresh(submission)

        if jti:
            await FormTokenService.record_submission_idempotency(
                redis, jti, submission.id
            )

        # 7. Asynchronously Enqueue Triage Task to Background Worker
        try:
            from app.features.feedback.tasks import triage_submission_task

            await triage_submission_task.kiq(str(submission.id))
        except Exception as exc:
            logger.warning(
                "feedback.submission.taskiq_enqueue_warning",
                submission_id=str(submission.id),
                error=str(exc),
            )

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

    async def _ensure_active_workspace(self, workspace_id: UUID) -> Workspace:
        """Fetch an active (non-deleted) workspace or raise 404."""
        ws = await self.session.get(Workspace, workspace_id)
        if not ws or ws.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )
        return ws

    @staticmethod
    def _sanitize_csv_cell(value: object) -> str:
        """
        Convert a cell value to CSV-safe string and guard against spreadsheet formula injection.
        Numeric values pass through unchanged; strings starting with formula triggers are prefixed.
        """
        if value is None:
            return ""
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return str(value)
        text = str(value)
        if text.startswith(("=", "+", "-", "@", "\t", "\r")):
            return f"'{text}"
        return text

    @staticmethod
    def _validate_rating_range(rating: int | None, scale_type: str) -> str | None:
        """Validate a numeric rating against its scale and return an error message if invalid."""
        if rating is None:
            return None
        if scale_type in ("5_star", "5_emoji") and not (1 <= rating <= 5):
            return "Rating must be an integer between 1 and 5"
        if scale_type == "1_10_numeric" and not (1 <= rating <= 10):
            return "Rating must be an integer between 1 and 10"
        return None

    @staticmethod
    def _match_category_by_keywords(
        categories: Sequence[FeedbackCategory],
        comment: str | None,
    ) -> FeedbackCategory | None:
        """Match an active non-uncategorized category deterministically from keyword word boundaries."""
        if not comment:
            return None
        comment_lower = comment.lower()
        best_cat: FeedbackCategory | None = None
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
                if re.search(rf"\b{re.escape(kw_clean)}\b", comment_lower):
                    match_count += 1
            if match_count > max_matches:
                max_matches = match_count
                best_cat = cat

        return best_cat

    @staticmethod
    def _infer_sentiment(
        rating: int | None,
        scale_type: str,
        comment: str | None,
    ) -> str | None:
        """Infer deterministic rule-based sentiment from rating or comment word matches."""
        if rating is not None:
            if scale_type in ("5_star", "5_emoji"):
                if rating >= 4:
                    return "positive"
                if rating == 3:
                    return "neutral"
                return "negative"
            if scale_type == "1_10_numeric":
                if rating >= 7:
                    return "positive"
                if rating in (5, 6):
                    return "neutral"
                return "negative"

        if comment:
            comment_lower = comment.lower()
            pos_count = sum(
                1
                for word in _POSITIVE_SENTIMENT_WORDS
                if re.search(rf"\b{word}\b", comment_lower)
            )
            neg_count = sum(
                1
                for word in _NEGATIVE_SENTIMENT_WORDS
                if re.search(rf"\b{word}\b", comment_lower)
            )
            if pos_count > neg_count:
                return "positive"
            if neg_count > pos_count:
                return "negative"
            return "neutral"

        return None

    async def _resolve_or_create_form(
        self,
        workspace_id: UUID,
        form_id: UUID | None = None,
        fallback_name: str = "Product Feedback",
        fallback_slug: str = "product-feedback",
        rating_required: bool = False,
    ) -> Form:
        """Resolve an explicit or first active workspace form, creating a default if none exists."""
        if form_id is not None:
            form = await self.form_repo.get_by_id(workspace_id, form_id)
            if not form:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Form not found",
                )
            return form

        forms = await self.form_repo.list_active(workspace_id)
        if forms:
            return forms[0]

        default_form = Form(
            workspace_id=workspace_id,
            name=fallback_name,
            title=fallback_name,
            slug=fallback_slug,
            subtitle="Share your thoughts, suggestions, and feedback with our team.",
            rating_scale_type="5_star",
            rating_required=rating_required,
            is_active=True,
        )
        self.session.add(default_form)
        await self.session.flush()
        return default_form

    @staticmethod
    def _parse_import_created_at(
        raw_value: str | datetime | None,
        default_now: datetime,
    ) -> datetime:
        """Parse an imported timestamp string or datetime into a UTC-aware datetime."""
        if raw_value is None:
            return default_now
        if isinstance(raw_value, datetime):
            return raw_value if raw_value.tzinfo else raw_value.replace(tzinfo=UTC)

        text = str(raw_value).strip()
        if not text:
            return default_now

        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            pass

        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y"):
            try:
                return datetime.strptime(text, fmt).replace(tzinfo=UTC)
            except ValueError:
                continue

        raise ValueError(f"Invalid created_at timestamp '{text}'")

    @staticmethod
    def _parse_csv_import_rows(csv_text: str) -> list[tuple[int, dict[str, object]]]:
        """Parse UTF-8 CSV text (with optional BOM) into numbered candidate row dicts."""
        cleaned = csv_text.lstrip("\ufeff").strip()
        if not cleaned:
            return []

        reader = csv.DictReader(io.StringIO(cleaned))
        if not reader.fieldnames:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="CSV header row is required",
            )

        candidates: list[tuple[int, dict[str, object]]] = []
        for row_number, raw_row in enumerate(reader, start=2):
            if not any(str(v or "").strip() for v in raw_row.values()):
                continue

            mapped: dict[str, object] = {}
            used_nps_col = False
            for raw_header, raw_val in raw_row.items():
                if not raw_header:
                    continue
                norm_header = (
                    raw_header.strip()
                    .lower()
                    .replace(" ", "_")
                    .replace("-", "_")
                )
                canonical = _CSV_COLUMN_ALIASES.get(norm_header)
                if not canonical:
                    continue
                val_str = str(raw_val).strip() if raw_val is not None else ""
                if not val_str:
                    continue
                if norm_header == "nps":
                    used_nps_col = True
                if canonical not in mapped:
                    mapped[canonical] = val_str

            if used_nps_col and "rating_scale_type" not in mapped:
                mapped["rating_scale_type"] = "1_10_numeric"

            candidates.append((row_number, mapped))

        return candidates

    def _collect_import_candidates(
        self,
        payload: FeedbackImportRequest,
    ) -> list[tuple[int, dict[str, object]]]:
        """Gather numbered candidate rows from csv_text, paste_lines, and structured rows."""
        candidates: list[tuple[int, dict[str, object]]] = []

        if payload.csv_text and payload.csv_text.strip():
            candidates.extend(self._parse_csv_import_rows(payload.csv_text))

        if payload.paste_lines:
            for idx, line in enumerate(payload.paste_lines, start=1):
                cleaned_line = line.strip()
                if cleaned_line:
                    candidates.append(
                        (
                            idx,
                            {
                                "comment": cleaned_line,
                                "source": payload.default_source,
                            },
                        )
                    )

        if payload.rows:
            for idx, row in enumerate(payload.rows, start=1):
                candidates.append((idx, row.model_dump(mode="python")))

        if not candidates:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="No feedback rows provided to import",
            )
        if len(candidates) > _MAX_IMPORT_ROWS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Maximum {_MAX_IMPORT_ROWS} rows allowed per import batch",
            )
        return candidates

    def _build_imported_submission(
        self,
        workspace_id: UUID,
        form_id: UUID,
        row_number: int,
        raw_row: dict[str, object],
        payload: FeedbackImportRequest,
        categories: Sequence[FeedbackCategory],
        categories_by_id: dict[UUID, FeedbackCategory],
        categories_by_lookup: dict[str, FeedbackCategory],
        imported_at: datetime,
    ) -> tuple[FeedbackSubmission | None, bool, FeedbackImportErrorItem | None]:
        """Validate one import candidate and construct a FeedbackSubmission or row error."""
        normalized = dict(raw_row)

        raw_rating = normalized.get("rating")
        if raw_rating is None or str(raw_rating).strip() == "":
            normalized["rating"] = payload.default_rating
        elif isinstance(raw_rating, bool):
            return (
                None,
                False,
                FeedbackImportErrorItem(
                    row_number=row_number, reason="Rating must be a whole number"
                ),
            )
        elif isinstance(raw_rating, int):
            normalized["rating"] = raw_rating
        else:
            try:
                normalized["rating"] = int(str(raw_rating).strip())
            except ValueError:
                return (
                    None,
                    False,
                    FeedbackImportErrorItem(
                        row_number=row_number,
                        reason=f"Invalid rating '{raw_rating}'; expected a whole number",
                    ),
                )

        raw_comment = normalized.get("comment")
        comment_clean = str(raw_comment).strip() if raw_comment is not None else ""
        normalized["comment"] = comment_clean or None

        if not normalized["comment"] and normalized["rating"] is None:
            return (
                None,
                False,
                FeedbackImportErrorItem(
                    row_number=row_number,
                    reason="Row must contain a comment or a rating",
                ),
            )

        for opt_str_field in (
            "customer_email",
            "customer_name",
            "category_name",
            "source",
            "page_url",
            "plan_tier",
        ):
            val = normalized.get(opt_str_field)
            if val is not None:
                cleaned_val = str(val).strip()
                normalized[opt_str_field] = cleaned_val or None

        raw_scale = normalized.get("rating_scale_type")
        normalized["rating_scale_type"] = (
            str(raw_scale).strip().lower()
            if raw_scale and str(raw_scale).strip()
            else "5_star"
        )

        raw_status = normalized.get("status")
        if raw_status and str(raw_status).strip():
            status_key = str(raw_status).strip().lower()
            mapped_status = _STATUS_ALIASES.get(status_key)
            if not mapped_status:
                return (
                    None,
                    False,
                    FeedbackImportErrorItem(
                        row_number=row_number,
                        reason=f"Invalid status '{raw_status}'",
                    ),
                )
            normalized["status"] = mapped_status
        else:
            normalized["status"] = "new"

        raw_sentiment = normalized.get("sentiment")
        if raw_sentiment is not None and str(raw_sentiment).strip():
            normalized["sentiment"] = str(raw_sentiment).strip().lower()
        else:
            normalized["sentiment"] = None

        raw_created = normalized.pop("created_at", None)
        try:
            row_created_at = self._parse_import_created_at(
                raw_created if isinstance(raw_created, (str, datetime)) else None,
                imported_at,
            )
        except ValueError as exc:
            return (
                None,
                False,
                FeedbackImportErrorItem(row_number=row_number, reason=str(exc)),
            )

        try:
            parsed_row = FeedbackImportRow.model_validate(normalized)
        except ValidationError as exc:
            first_err = exc.errors()[0]
            loc = ".".join(str(part) for part in first_err.get("loc", ()))
            msg = str(first_err.get("msg", "Invalid row data"))
            reason = f"{loc}: {msg}" if loc else msg
            return (
                None,
                False,
                FeedbackImportErrorItem(row_number=row_number, reason=reason),
            )

        rating_error = self._validate_rating_range(
            parsed_row.rating, parsed_row.rating_scale_type
        )
        if rating_error:
            return (
                None,
                False,
                FeedbackImportErrorItem(row_number=row_number, reason=rating_error),
            )

        category_id: UUID | None = None
        category_label: str | None = (
            parsed_row.category_name[:100] if parsed_row.category_name else None
        )

        if parsed_row.category_name:
            matched_cat = categories_by_lookup.get(parsed_row.category_name.lower())
            if matched_cat:
                category_id = matched_cat.id
                category_label = matched_cat.name

        if category_id is None and parsed_row.comment:
            kw_cat = self._match_category_by_keywords(categories, parsed_row.comment)
            if kw_cat is not None:
                category_id = kw_cat.id
                if category_label is None:
                    category_label = kw_cat.name

        if category_id is None and payload.default_category_id is not None:
            default_cat = categories_by_id.get(payload.default_category_id)
            if default_cat:
                category_id = default_cat.id
                if category_label is None:
                    category_label = default_cat.name

        sentiment = parsed_row.sentiment or self._infer_sentiment(
            rating=parsed_row.rating,
            scale_type=parsed_row.rating_scale_type,
            comment=parsed_row.comment,
        )

        effective_source = (parsed_row.source or payload.default_source).strip()
        metadata: dict[str, object] = {
            "source": effective_source,
            "imported": True,
            "import_method": payload.default_source,
        }
        if parsed_row.page_url:
            metadata["page_url"] = parsed_row.page_url
        if parsed_row.plan_tier:
            metadata["plan_tier"] = parsed_row.plan_tier

        customer_email = (
            str(parsed_row.customer_email).strip().lower()[:255]
            if parsed_row.customer_email
            else None
        )
        raw_hash_input = (
            f"{parsed_row.rating}:{parsed_row.comment or ''}:{customer_email or ''}:{row_created_at.isoformat()}"
        )
        content_hash = hashlib.sha256(raw_hash_input.encode("utf-8")).hexdigest()

        submission = FeedbackSubmission(
            workspace_id=workspace_id,
            form_id=form_id,
            category_id=category_id,
            category_pill_label=category_label,
            rating=parsed_row.rating,
            rating_scale_type=parsed_row.rating_scale_type,
            comment=parsed_row.comment,
            custom_answers={},
            customer_email=customer_email,
            customer_name=parsed_row.customer_name[:255] if parsed_row.customer_name else None,
            customer_metadata=metadata,
            status=parsed_row.status,
            sentiment=sentiment,
            trust_level="imported",
            lane="lane_a",
            source=effective_source[:30],
            content_hash=content_hash,
            challenge_result="skipped",
            spam_score=0,
            spam_reasons=[],
            # Historical backfills skip live worker triage and alert floods immediately.
            triage_state="done",
            alert_evaluated_at=imported_at,
            alert_evaluation_attempts=0,
            created_at=row_created_at,
            updated_at=row_created_at,
        )
        return submission, category_id is not None, None

    async def import_submissions(
        self,
        workspace_id: UUID,
        payload: FeedbackImportRequest,
    ) -> FeedbackImportResponse:
        """
        Batch-import historical or external feedback via CSV text, pasted lines, or structured rows.
        Uses deterministic category/sentiment rules only and skips live Slack alert evaluation.
        """
        await self._ensure_active_workspace(workspace_id)
        target_form = await self._resolve_or_create_form(
            workspace_id=workspace_id,
            form_id=payload.form_id,
            fallback_name="Imported Feedback",
            fallback_slug="imported-feedback",
        )

        categories = await self.category_repo.list_active(workspace_id)
        categories_by_id = {cat.id: cat for cat in categories}
        if (
            payload.default_category_id is not None
            and payload.default_category_id not in categories_by_id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Default category not found",
            )

        categories_by_lookup: dict[str, FeedbackCategory] = {}
        for cat in categories:
            categories_by_lookup[cat.name.strip().lower()] = cat
            categories_by_lookup[cat.slug.strip().lower()] = cat

        candidates = self._collect_import_candidates(payload)
        imported_at = datetime.now(UTC)

        submissions_to_save: list[FeedbackSubmission] = []
        errors: list[FeedbackImportErrorItem] = []
        categorized_count = 0

        for row_number, raw_row in candidates:
            sub, is_categorized, row_error = self._build_imported_submission(
                workspace_id=workspace_id,
                form_id=target_form.id,
                row_number=row_number,
                raw_row=raw_row,
                payload=payload,
                categories=categories,
                categories_by_id=categories_by_id,
                categories_by_lookup=categories_by_lookup,
                imported_at=imported_at,
            )
            if row_error is not None or sub is None:
                errors.append(
                    row_error
                    or FeedbackImportErrorItem(
                        row_number=row_number, reason="Invalid row data"
                    )
                )
                continue
            submissions_to_save.append(sub)
            if is_categorized:
                categorized_count += 1

        if not submissions_to_save:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=errors[0].reason if errors else "No valid feedback rows imported",
            )

        self.session.add_all(submissions_to_save)
        await self.session.commit()

        return FeedbackImportResponse(
            imported_count=len(submissions_to_save),
            skipped_count=len(errors),
            categorized_count=categorized_count,
            form_id=target_form.id,
            errors=errors,
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
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
    ) -> tuple[Sequence[FeedbackSubmission], int]:
        """
        List feedback submissions for a workspace with pagination and optional filters.
        """
        await self._ensure_active_workspace(workspace_id)
        return await self.submission_repo.list_by_workspace(
            workspace_id=workspace_id,
            limit=limit,
            offset=offset,
            status=status_filter,
            category_id=category_id,
            sentiment=sentiment,
            query=query,
            form_id=form_id,
            source=source,
            page_url=page_url,
            plan_tier=plan_tier,
        )

    async def export_submissions_csv(
        self,
        workspace_id: UUID,
        status_filter: str | None = None,
        category_id: UUID | None = None,
        sentiment: str | None = None,
        query: str | None = None,
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
    ) -> str:
        """
        Export matching workspace feedback submissions as UTF-8 RFC-4180 CSV.
        """
        await self._ensure_active_workspace(workspace_id)
        submissions = await self.submission_repo.list_for_export(
            workspace_id=workspace_id,
            status=status_filter,
            category_id=category_id,
            sentiment=sentiment,
            query=query,
            form_id=form_id,
            source=source,
            page_url=page_url,
            plan_tier=plan_tier,
        )
        categories = await self.category_repo.list_active(workspace_id)
        category_names = {cat.id: cat.name for cat in categories}

        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\n")
        writer.writerow(
            [
                "id",
                "created_at",
                "status",
                "rating",
                "rating_scale_type",
                "sentiment",
                "category",
                "comment",
                "customer_name",
                "customer_email",
                "source",
                "page_url",
                "referrer",
                "custom_answers",
            ]
        )

        for sub in submissions:
            metadata = (
                sub.customer_metadata
                if isinstance(sub.customer_metadata, dict)
                else {}
            )
            cat_name = (
                category_names.get(sub.category_id)
                if sub.category_id is not None
                else None
            ) or sub.category_pill_label
            custom_answers_str = (
                json.dumps(sub.custom_answers, ensure_ascii=False, sort_keys=True)
                if sub.custom_answers
                else ""
            )

            writer.writerow(
                [
                    str(sub.id),
                    sub.created_at.isoformat(),
                    self._sanitize_csv_cell(sub.status),
                    self._sanitize_csv_cell(sub.rating),
                    self._sanitize_csv_cell(sub.rating_scale_type),
                    self._sanitize_csv_cell(sub.sentiment),
                    self._sanitize_csv_cell(cat_name),
                    self._sanitize_csv_cell(sub.comment),
                    self._sanitize_csv_cell(sub.customer_name),
                    self._sanitize_csv_cell(sub.customer_email),
                    self._sanitize_csv_cell(metadata.get("source") or sub.source),
                    self._sanitize_csv_cell(metadata.get("page_url")),
                    self._sanitize_csv_cell(metadata.get("referrer")),
                    self._sanitize_csv_cell(custom_answers_str),
                ]
            )

        return buf.getvalue()

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
        await self._ensure_active_workspace(workspace_id)

        # 1. Ensure an active form exists
        target_form = await self._resolve_or_create_form(
            workspace_id=workspace_id,
            fallback_name="Product Feedback",
            fallback_slug="product-feedback",
            rating_required=True,
        )
        target_form_id = target_form.id

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
        await self._ensure_active_workspace(workspace_id)

        deleted = await self.submission_repo.delete_sample_submissions(workspace_id)
        await self.session.commit()
        return deleted
