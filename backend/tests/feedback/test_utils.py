"""
Unit tests for feedback utility functions (domain authorization, host extraction).
"""

from app.features.feedback.utils import extract_host, is_domain_allowed


def test_extract_host() -> None:
    assert extract_host("https://example.com/some/path") == "example.com"
    assert extract_host("http://sub.domain.co.uk:8080/test?query=1") == "sub.domain.co.uk"
    assert extract_host("acme.org") == "acme.org"
    assert extract_host("  HTTPS://UpperCase.Com/ ") == "uppercase.com"
    assert extract_host("") == ""
    assert extract_host(None) == ""


def test_is_domain_allowed_empty_allows_all() -> None:
    assert is_domain_allowed([], "https://anywhere.com") is True
    assert is_domain_allowed(None, "https://anywhere.com") is True
    assert is_domain_allowed([], None) is True


def test_is_domain_allowed_exact_and_subdomain() -> None:
    allowed = ["acme.com", "*.partner.org"]
    # Exact match
    assert is_domain_allowed(allowed, "https://acme.com") is True
    # Subdomain match on domain
    assert is_domain_allowed(allowed, "https://shop.acme.com") is True
    # Wildcard match
    assert is_domain_allowed(allowed, "https://api.partner.org") is True
    # Disallowed domain
    assert is_domain_allowed(allowed, "https://evil.com") is False
    # None origin with restricted domains
    assert is_domain_allowed(allowed, None) is False


def test_is_domain_allowed_platform_origin_bypass() -> None:
    allowed = ["acme.com"]
    platform = ["http://localhost:3000", "https://app.feedbacksystem.com"]
    # Platform preview origin is always permitted
    assert is_domain_allowed(allowed, "http://localhost:3000", platform_origins=platform) is True
    assert (
        is_domain_allowed(allowed, "https://app.feedbacksystem.com", platform_origins=platform)
        is True
    )
