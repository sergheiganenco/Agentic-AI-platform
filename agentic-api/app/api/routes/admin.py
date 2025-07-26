from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, UserCreate, UserListResponse
from app.api.dependencies import admin_required
from app.core.security import hash_password
from app.utils.email import send_email
from app.utils.token import generate_token
from datetime import datetime, timedelta

router = APIRouter()

# List users with pagination, filtering
@router.get("/users", response_model=UserListResponse)
def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    query = db.query(User)
    if search:
        search_like = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_like),
                User.name.ilike(search_like),
                User.role.ilike(search_like)
            )
        )
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    return {"users": [UserRead.from_orm(u) for u in users], "total": total}

# Create user (admin only)
@router.post("/users", response_model=UserRead, status_code=201)
def admin_create_user(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    existing = db.query(User).filter(User.email == user_create.email).first()
    if existing:
        raise HTTPException(400, "User already exists")
    user_obj = User(
        email=user_create.email,
        name=user_create.name,
        role=user_create.role or "user",
        hashed_password=hash_password(user_create.password),
        status="active",
        is_verified=True,
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return UserRead.from_orm(user_obj)

# Admin updates any user
@router.patch("/users/{user_id}", response_model=UserRead)
def admin_update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user_update.name is not None:
        user.name = user_update.name
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.status is not None:
        user.status = user_update.status
    db.commit()
    db.refresh(user)
    return UserRead.from_orm(user)

# Admin: Reset user password (sends email with reset link)
@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    token = generate_token()
    expires = datetime.utcnow() + timedelta(hours=1)
    user.reset_token = token
    user.reset_token_expires = expires
    db.commit()
    reset_link = f"https://yourdomain.com/reset-password?token={token}"
    send_email(
        user.email,
        "Password Reset Request",
        f"An admin requested a password reset for your account. Click here: {reset_link}"
    )
    return {"message": "Reset email sent."}
