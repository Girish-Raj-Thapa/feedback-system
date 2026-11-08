"""
Utility functions for feedback domain and widget processing.
"""

from urllib.parse import urlparse

from app.core.config import settings


def extract_host(url_or_domain: str | None) -> str:
    """
    Extract lowercase hostname from a URL, origin, referer, or raw domain string.
    """
    if not url_or_domain:
        return ""
    text = url_or_domain.strip().lower()
    if not text:
        return ""
    if "://" in text:
        parsed = urlparse(text)
        return parsed.hostname or ""
    # Remove path if present
    text = text.split("/")[0]
    # Remove port if present
    text = text.split(":")[0]
    return text


def is_domain_allowed(
    allowed_domains: list[str] | None,
    origin_or_referer: str | None,
    platform_origins: list[str] | None = None,
) -> bool:
    """
    Verify whether an incoming request Origin or Referer is permitted by form.allowed_domains.

    Rules:
    1. If allowed_domains is empty/null, all domains are allowed by default.
    2. If origin_or_referer matches the platform's own origin (e.g. settings.CORS_ORIGINS),
       it is always allowed so workspace members can preview and test their forms.
    3. If allowed_domains has entries, origin_or_referer must match at least one allowed domain:
       - Supports exact match: "acme.com" matches "acme.com"
       - Supports subdomains: "acme.com" matches "shop.acme.com"
       - Supports explicit wildcard: "*.acme.com" matches "shop.acme.com"
    """
    if not allowed_domains:
        return True

    cleaned_allowed = [
        extract_host(d) for d in allowed_domains if extract_host(d)
    ]
    if not cleaned_allowed:
        return True

    req_host = extract_host(origin_or_referer)
    if not req_host:
        return False

    # Check platform origins (e.g. localhost:3000, production app origin)
    trusted_origins = platform_origins or settings.CORS_ORIGINS
    for trusted in trusted_origins:
        trusted_host = extract_host(trusted)
        if trusted_host and (req_host == trusted_host or req_host.endswith(f".{trusted_host}")):
            return True

    # Check against form.allowed_domains
    for allowed in cleaned_allowed:
        if req_host == allowed:
            return True
        if allowed.startswith("*."):
            suffix = allowed[2:]
            if req_host == suffix or req_host.endswith(f".{suffix}"):
                return True
        if req_host.endswith(f".{allowed}"):
            return True

    return False
