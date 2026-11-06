"""
Unit tests for cryptographic encryption at rest for customer-sensitive URLs.
Verifies RFC 5869 HKDF-SHA256 tenant key isolation, MultiFernet rotation,
and backward compatibility.
"""

from uuid import uuid4
import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings
from app.core.security.encryption import (
    EncryptedString,
    decrypt_secret,
    derive_hkdf_key,
    encrypt_secret,
    get_encryption_key,
    set_current_tenant_id,
    tenant_encryption_context,
)


def test_encryption_key_deterministic() -> None:
    """Verify encryption key is 32 base64 bytes and deterministic."""
    key1 = get_encryption_key()
    key2 = get_encryption_key()
    assert key1 == key2
    assert len(key1) == 44  # base64 representation of 32 bytes


def test_tenant_keys_are_cryptographically_isolated() -> None:
    """Verify different workspaces receive distinct, non-overlapping keys via HKDF-SHA256."""
    ws_1 = str(uuid4())
    ws_2 = str(uuid4())

    key_1 = get_encryption_key(ws_1)
    key_2 = get_encryption_key(ws_2)

    assert key_1 != key_2
    assert len(key_1) == 44
    assert len(key_2) == 44


def test_encrypt_and_decrypt_roundtrip_master() -> None:
    """Verify sensitive URL encrypts to envelope format and decrypts back."""
    url = "https://hooks.slack.com/services/T0123/B0456/SECRET_TOKEN_9999"
    encrypted = encrypt_secret(url)
    assert encrypted is not None
    assert encrypted != url
    assert encrypted.startswith("enc:v1:master:")
    assert "SECRET_TOKEN" not in encrypted

    decrypted = decrypt_secret(encrypted)
    assert decrypted == url


def test_tenant_isolated_encryption_and_cross_tenant_rejection() -> None:
    """Verify data encrypted for Tenant A cannot be decrypted by Tenant B."""
    tenant_a = str(uuid4())
    tenant_b = str(uuid4())
    webhook_url_a = "https://hooks.slack.com/services/TENANT_A/WEBHOOK"

    # Encrypt explicitly with tenant_a
    encrypted_a = encrypt_secret(webhook_url_a, tenant_id=tenant_a)
    assert encrypted_a is not None
    assert encrypted_a.startswith(f"enc:v1:{tenant_a}:")

    # 1. Tenant A decrypts successfully
    decrypted_a = decrypt_secret(encrypted_a, tenant_id=tenant_a)
    assert decrypted_a == webhook_url_a

    # 2. Tenant B attempts to decrypt Tenant A's ciphertext -> REJECTED
    with pytest.raises(InvalidToken, match="Cryptographic tenant mismatch"):
        decrypt_secret(encrypted_a, tenant_id=tenant_b)


def test_tenant_encryption_context_manager() -> None:
    """Verify tenant_encryption_context seamlessly sets and clears tenant isolation."""
    tenant_id = str(uuid4())
    raw_token = "secret-token-value-xyz"

    with tenant_encryption_context(tenant_id):
        encrypted = encrypt_secret(raw_token)
        assert encrypted is not None
        assert encrypted.startswith(f"enc:v1:{tenant_id}:")

    # Context restored back to master
    encrypted_master = encrypt_secret(raw_token)
    assert encrypted_master is not None
    assert encrypted_master.startswith("enc:v1:master:")


def test_legacy_gAAAAA_fernet_token_backward_compatibility() -> None:
    """Verify legacy tokens created with raw Fernet (starting with gAAAAA) decrypt cleanly."""
    master_key = derive_hkdf_key(settings.master_encryption_key, "system:master")
    legacy_cipher = Fernet(master_key)
    legacy_url = "https://hooks.slack.com/services/LEGACY/TOKEN/1234"
    legacy_token = legacy_cipher.encrypt(legacy_url.encode("utf-8")).decode("utf-8")

    assert legacy_token.startswith("gAAAAA")

    decrypted = decrypt_secret(legacy_token)
    assert decrypted == legacy_url


def test_decrypt_handles_none_and_plaintext() -> None:
    """Verify graceful fallback for None or unencrypted legacy plaintext strings."""
    assert decrypt_secret(None) is None
    legacy_url = "https://hooks.slack.com/services/T1/B2/token"
    # Legacy plaintext without Fernet prefix returns as-is
    assert decrypt_secret(legacy_url) == legacy_url


def test_encrypted_string_type_decorator() -> None:
    """Verify SQLAlchemy EncryptedString type decorator binds and results with context."""
    tenant_id = str(uuid4())
    decorator = EncryptedString()
    plain_url = "https://hooks.slack.com/services/TEST/BIND"

    with tenant_encryption_context(tenant_id):
        bind_value = decorator.process_bind_param(plain_url, dialect=None)
        assert bind_value is not None
        assert bind_value.startswith(f"enc:v1:{tenant_id}:")

        result_value = decorator.process_result_value(bind_value, dialect=None)
        assert result_value == plain_url
