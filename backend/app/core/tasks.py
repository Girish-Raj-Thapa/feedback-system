"""
Taskiq broker initialization.
"""

from taskiq_redis import ListQueueBroker

import app.db.models  # noqa: F401 - Register all models and compile mappers for background workers
from app.core.config import settings

# Queue workers require socket_timeout=None to allow indefinite BRPOP long-polling.
# TCP keepalive prevents the OS or network gateways from terminating idle connections.
broker = ListQueueBroker(
    url=settings.REDIS_URL,
    queue_name="feedback_tasks",
    socket_timeout=None,
    socket_connect_timeout=5,
    socket_keepalive=True,
)
