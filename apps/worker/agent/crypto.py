"""AES-256-GCM decryption compatible with the Go API's crypto package."""

import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def get_encryption_key() -> bytes:
    """Load the 32-byte encryption key from ENCRYPTION_KEY env var (hex-encoded)."""
    hex_key = os.environ.get("ENCRYPTION_KEY", "")
    if not hex_key:
        raise RuntimeError("ENCRYPTION_KEY env var is not set")
    key = bytes.fromhex(hex_key)
    if len(key) != 32:
        raise RuntimeError(f"ENCRYPTION_KEY must be 32 bytes, got {len(key)}")
    return key


def decrypt(ciphertext: bytes, key: bytes) -> bytes:
    """Decrypt ciphertext produced by Go's crypto.Encrypt (12-byte nonce prefix + AES-256-GCM)."""
    nonce_size = 12
    if len(ciphertext) < nonce_size:
        raise ValueError("ciphertext too short")
    nonce = ciphertext[:nonce_size]
    ct = ciphertext[nonce_size:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None)
