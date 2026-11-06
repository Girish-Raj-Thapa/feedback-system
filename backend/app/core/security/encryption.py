"""
Cryptographic encryption at rest for customer-sensitive webhook URLs and tokens.
Uses Fernet (AES-128-CBC + HMAC-SHA256 authenticated encryption) with unique,
cryptographically isolated keys derived per customer using HKDF-SHA256 anchored
to the application master secret.
"""

from contextlib import contextmanager
from contextvars import ContextVar, Token
from functools import lru_cache
import base64
import hashlib
import logging
from typing import Any
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.config import settings

logger = logging.getLogger(__name__)

# Domain separation salt for HKDF key derivation
TENANT_KDF_SALT = b"feedbackflow-tenant-encryption-v1"

# Thread-safe ContextVar to track current tenant / workspace ID during ORM operations
current_tenant_id: ContextVar[str | None] = ContextVar("current_tenant_id", default=None)


def set_current_tenant_id(tenant_id: str | UUID | None) -> Token:
    """Set the active tenant context for encryption operations."""
    val = str(tenant_id) if tenant_id is not None else None
    return current_tenant_id.set(val)


def get_current_tenant_id() -> str | None:
    """Retrieve the currently active tenant ID, if any."""
    return current_tenant_id.get()


@contextmanager
def tenant_encryption_context(tenant_id: str | UUID | None):
    """
    Context manager that temporarily sets the tenant ID for all encryption
    operations within its scope, then restores the previous context.
    """
    token = set_current_tenant_id(tenant_id)
    try:
        yield
    finally:
        current_tenant_id.reset(token)


def derive_hkdf_key(master_secret: str | bytes, info: str | bytes) -> bytes:
    """
    Derive a deterministic 32-byte urlsafe base64-encoded Fernet key using
    RFC 5869 HKDF-SHA256 anchored to the provided master secret.
    """
    secret_bytes = master_secret.encode("utf-8") if isinstance(master_secret, str) else master_secret
    info_bytes = info.encode("utf-8") if isinstance(info, str) else info

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=TENANT_KDF_SALT,
        info=info_bytes,
    )
    derived = hkdf.derive(secret_bytes)
    return base64.urlsafe_b64encode(derived)


def derive_legacy_sha256_key(master_secret: str) -> bytes:
    """
    Legacy fallback key derivation (raw SHA-256 digest) to ensure zero downtime
    for existing stored tokens during key architecture migrations.
    """
    key_digest = hashlib.sha256(master_secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(key_digest)


def get_encryption_key(tenant_id: str | UUID | None = None) -> bytes:
    """
    Return the primary 32-byte base64 Fernet key.
    If tenant_id is provided, returns the HKDF-derived tenant key.
    If omitted, returns the master HKDF key.
    """
    info = f"tenant:{tenant_id}" if tenant_id is not None else "system:master"
    return derive_hkdf_key(settings.master_encryption_key, info)


@lru_cache(maxsize=2048)
def get_tenant_cipher(tenant_id: str | None = None) -> MultiFernet:
    """
    Return a cached MultiFernet instance for the given tenant ID.
    Supports key rotation: primary key encrypts new values, while any configured
    rotation keys or legacy keys can decrypt older records.
    """
    effective_tenant = tenant_id if tenant_id is not None else "master"
    info = f"tenant:{effective_tenant}" if effective_tenant != "master" else "system:master"

    # 1. Primary key from current master secret
    primary_key = derive_hkdf_key(settings.master_encryption_key, info)
    fernets: list[Fernet] = [Fernet(primary_key)]

    # 2. Key rotation: secondary keys derived from configured rotation master secrets
    for rot_secret in settings.FIELD_ENCRYPTION_ROTATION_KEYS:
        if rot_secret and rot_secret != settings.master_encryption_key:
            fernets.append(Fernet(derive_hkdf_key(rot_secret, info)))

    # 3. Master / legacy token fallback (for tokens created before tenant derivation)
    if effective_tenant == "master":
        legacy_key = derive_legacy_sha256_key(settings.master_encryption_key)
        if legacy_key != primary_key:
            fernets.append(Fernet(legacy_key))

    return MultiFernet(fernets)


def encrypt_secret(plain_text: str | None, tenant_id: str | UUID | None = None) -> str | None:
    """
    Encrypt plaintext string into authenticated ciphertext using a tenant-isolated
    Fernet key derived via HKDF-SHA256.

    Stores ciphertext in envelope format: `enc:v1:<tenant_id>:<fernet_token>`
    Returns None if input is None.
    """
    if plain_text is None:
        return None

    # Determine tenant context (explicit arg > contextvar > "master")
    effective_tenant = str(tenant_id) if tenant_id is not None else (current_tenant_id.get() or "master")
    cipher = get_tenant_cipher(effective_tenant)
    token = cipher.encrypt(plain_text.encode("utf-8")).decode("utf-8")

    return f"enc:v1:{effective_tenant}:{token}"


def decrypt_secret(cipher_text: str | None, tenant_id: str | UUID | None = None) -> str | None:
    """
    Decrypt ciphertext back to plaintext string.
    
    Validates cryptographic tenant isolation: if a specific tenant_id is passed,
    it verifies that the ciphertext was actually encrypted for that tenant.
    
    Gracefully handles:
    - Tenant-isolated tokens (`enc:v1:<tenant_id>:<token>`)
    - Legacy un-isolated Fernet tokens (`gAAAAA...`)
    - Plaintext strings during migrations
    """
    if cipher_text is None:
        return None

    # 1. Modern tenant-isolated envelope token
    if cipher_text.startswith("enc:v1:"):
        try:
            parts = cipher_text.split(":", 3)
            if len(parts) != 4:
                logger.error("Malformed encrypted envelope format")
                return cipher_text
            
            _, _, stored_tenant_id, token = parts

            # Cross-tenant tampering guard: if caller specified tenant_id, enforce match
            if tenant_id is not None and str(tenant_id) != stored_tenant_id:
                logger.error(
                    "Security alert: cross-tenant decryption attempt rejected. "
                    "Expected tenant: %s, Stored tenant: %s",
                    tenant_id,
                    stored_tenant_id,
                )
                raise InvalidToken(
                    f"Cryptographic tenant mismatch: expected {tenant_id}, got {stored_tenant_id}"
                )

            cipher = get_tenant_cipher(stored_tenant_id)
            return cipher.decrypt(token.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            raise
        except Exception as exc:
            logger.error("Failed to decrypt envelope secret: %s", exc)
            return cipher_text

    # 2. Legacy master-key Fernet token (without tenant prefix)
    if cipher_text.startswith("gAAAAA"):
        try:
            cipher = get_tenant_cipher("master")
            return cipher.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
        except (InvalidToken, Exception) as exc:
            logger.warning("Failed to decrypt legacy master token: %s", exc)
            return cipher_text

    # 3. Plaintext fallback (e.g. unencrypted strings before migration)
    return cipher_text


class EncryptedString(TypeDecorator[str]):
    """
    SQLAlchemy TypeDecorator that transparently encrypts strings on INSERT/UPDATE
    using tenant-isolated HKDF keys and decrypts on SELECT.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> str | None:
        if value is None:
            return None
        return encrypt_secret(str(value))

    def process_result_value(self, value: Any, dialect: Any) -> str | None:
        if value is None:
            return None
        return decrypt_secret(str(value))
