import secrets
import hashlib
import hmac
from typing import Optional, Tuple
from passlib.hash import argon2, bcrypt
from app.core.config import settings

def verify_scrypt_password(password: str, stored_hash: str, salt_hex: str) -> bool:
    """
    Verifies password against Node.js crypto.scryptSync(password, salt, 64).
    Node default params: N=16384, r=8, p=1, keylen=64.
    """
    try:
        salt_bytes = bytes.fromhex(salt_hex)
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt_bytes,
            n=16384,
            r=8,
            p=1,
            dklen=64
        ).hex()
        return hmac.compare_digest(derived, stored_hash)
    except Exception:
        return False

def hash_scrypt_password(password: str) -> Tuple[str, str]:
    """Generates Node-compatible scrypt salt & hash."""
    salt_bytes = secrets.token_bytes(16)
    salt_hex = salt_bytes.hex()
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_bytes,
        n=16384,
        r=8,
        p=1,
        dklen=64
    ).hex()
    return derived, salt_hex

def hash_password_argon2(password: str) -> str:
    """Modern, high-security Argon2id password hash."""
    return argon2.using(rounds=4, memory_cost=65536, parallelism=2).hash(password)

def verify_password(password: str, password_hash: str, salt: Optional[str] = None) -> bool:
    """
    Dual verifier: supports Argon2id, bcrypt, and historical Node scrypt.
    """
    # 1. Try Argon2
    if password_hash.startswith("$argon2"):
        try:
            return argon2.verify(password, password_hash)
        except Exception:
            return False

    # 2. Try Bcrypt
    if password_hash.startswith("$2b$") or password_hash.startswith("$2a$"):
        try:
            return bcrypt.verify(password, password_hash)
        except Exception:
            return False

    # 3. Historical Node scrypt fallback
    if salt:
        return verify_scrypt_password(password, password_hash, salt)

    return False

def generate_session_token() -> str:
    """Generates a secure 64-character hexadecimal session token."""
    return secrets.token_hex(32)
