from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.user import (
    UserRead, UserCreate, Token, PasswordResetRequest, PasswordResetForm,
    UserUpdateRequest, UserUpdate, ChangePasswordRequest
)
from app.models.user import User
from app.crud.user import get_user, get_users, create_user, get_user_by_email
from app.db.session import SessionLocal
from app.api.dependencies import get_current_user, admin_required
from app.core.security import hash_password, verify_password, create_access_token
from app.utils.token import generate_token
from app.utils.email import send_email
from datetime import datetime, timedelta
from jose import jwt
from app.config import settings

# --- Rate Limiting ----
from app.main import limiter

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=60))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

# ------------- CRUD ENDPOINTS -----------------

@router.get("/", response_model=List[UserRead])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_users(db, skip=skip, limit=limit)

@router.get("/verify-email")
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.verification_token == token,
        User.verification_token_expires > datetime.utcnow()
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    return {"message": "Email verified!"}

@router.get("/by-id/{user_id}", response_model=UserRead)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/admin/users", response_model=List[UserRead])
def list_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required)
):
    return get_users(db)

@router.patch("/admin/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.status is not None:
        user.status = user_update.status
    if getattr(user_update, "name", None) is not None:
        user.name = user_update.name
    db.commit()
    db.refresh(user)
    return user

# -------- RATE-LIMITED ENDPOINTS ----------

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def register(user: UserCreate, db: Session = Depends(get_db), request: Request = None):
    db_user = get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_dict = user.dict()
    user_dict["hashed_password"] = hash_password(user.password)
    user_dict.pop("password", None)
    user_dict["role"] = "user"
    token = generate_token()
    expires = datetime.utcnow() + timedelta(hours=24)
    user_dict["is_verified"] = False
    user_dict["verification_token"] = token
    user_dict["verification_token_expires"] = expires
    new_user = create_user(db, user_dict)
    verify_link = f"https://yourdomain.com/verify-email?token={token}"
    send_email(
        new_user.email,
        "Verify your email",
        f"Welcome! Please verify your email by clicking: {verify_link}"
    )
    return new_user

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(form_data: UserCreate, db: Session = Depends(get_db), request: Request = None):
    user = get_user_by_email(db, form_data.email)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox.")
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

# ------------- PROFILE ENDPOINTS -------------

@router.get("/me", response_model=UserRead)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserRead.from_orm(current_user)

@router.put("/me", response_model=UserRead)
def update_profile(
    user_update: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_update.name is not None:
        user.name = user_update.name
    db.commit()
    db.refresh(user)
    return UserRead.from_orm(user)

# ------------- PASSWORD MANAGEMENT ------------

@router.post("/request-password-reset")
def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)
    # Respond generically to avoid info leaks
    if user:
        token = generate_token()
        expires = datetime.utcnow() + timedelta(hours=1)
        user.reset_token = token
        user.reset_token_expires = expires
        db.commit()
        reset_link = f"https://yourdomain.com/reset-password?token={token}"
        send_email(
            user.email,
            "Password Reset Request",
            f"To reset your password, click: {reset_link}"
        )
    return {"message": "If that email is registered, you’ll receive a reset email."}

@router.post("/reset-password")
def reset_password(form: PasswordResetForm, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.reset_token == form.token,
        User.reset_token_expires > datetime.utcnow()
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user.hashed_password = hash_password(form.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password reset successful!"}

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.old_password, user.hashed_password):
        raise HTTPException(status_code=403, detail="Old password incorrect")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
