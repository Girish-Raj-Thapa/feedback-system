"""
Pagination models for list endpoints.
"""

from pydantic import BaseModel, ConfigDict


class Page[T](BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    items: list[T]
    total: int
    limit: int
    offset: int
