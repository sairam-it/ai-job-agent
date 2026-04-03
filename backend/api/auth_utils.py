# api/auth_utils.py
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY  = os.getenv("JWT_SECRET", "changeme")
ALGORITHM   = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINS = int(os.getenv("JWT_EXPIRE_MINUTES", 10080))


def hash_password(password: str) -> str:
    # bcrypt has a 72-byte maximum; reject anything longer explicitly
    pw_bytes = password.encode('utf-8')
    if len(pw_bytes) > 72:
        raise ValueError('Password must be 72 bytes or fewer (bcrypt limit).')

    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str) -> str:
    expire  = datetime.utcnow() + timedelta(minutes=EXPIRE_MINS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    """Returns user_id from token, raises JWTError if invalid."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload.get("sub")