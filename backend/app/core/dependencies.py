"""
Shared dependency aliases and common query parameters.
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session

DBSession = Annotated[AsyncSession, Depends(get_session)]


@dataclass
class Pagination:
    limit: Annotated[int, Query(ge=1, le=100)] = 20
    offset: Annotated[int, Query(ge=0)] = 0


PaginationDep = Annotated[Pagination, Depends()]
