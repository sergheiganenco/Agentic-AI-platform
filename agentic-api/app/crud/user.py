from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password
from typing import Optional
from datetime import datetime

def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate | dict) -> User:
    # Accepts both UserCreate pydantic obj or dict for flexibility
    if isinstance(user, UserCreate):
        user_data = user.dict()
    else:
        user_data = user

    password = user_data.pop("password", None)
    if password:
        user_data["hashed_password"] = hash_password(password)
    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

# -- NEW: set_user_verification --
def set_user_verification(db: Session, user: User, value: bool = True) -> User:
    user.is_verified = value
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    db.refresh(user)
    return user

# -- NEW: set_user_reset_token --
def set_user_reset_token(db: Session, user: User, token: str, expires: datetime) -> User:
    user.reset_token = token
    user.reset_token_expires = expires
    db.commit()
    db.refresh(user)
    return user

# -- NEW: set_user_password --
def set_user_password(db: Session, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    db.refresh(user)
    return user
