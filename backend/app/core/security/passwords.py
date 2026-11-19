import asyncio

from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()

# Cap concurrent Argon2id operations (~64 MiB each with m=65536) to prevent
# OOM spikes under login/signup bursts inside memory-bounded containers.
MAX_CONCURRENT_PASSWORD_HASHES = 4
_argon2_semaphore: asyncio.Semaphore | None = None
_argon2_semaphore_loop: asyncio.AbstractEventLoop | None = None


def _get_argon2_semaphore() -> asyncio.Semaphore:
    global _argon2_semaphore, _argon2_semaphore_loop
    loop = asyncio.get_running_loop()
    if _argon2_semaphore is None or _argon2_semaphore_loop is not loop:
        _argon2_semaphore = asyncio.Semaphore(MAX_CONCURRENT_PASSWORD_HASHES)
        _argon2_semaphore_loop = loop
    return _argon2_semaphore


async def hash_password(password: str) -> str:
    async with _get_argon2_semaphore():
        return await asyncio.to_thread(password_hasher.hash, password)


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    async with _get_argon2_semaphore():
        return await asyncio.to_thread(
            password_hasher.verify, plain_password, hashed_password
        )
