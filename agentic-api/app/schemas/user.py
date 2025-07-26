from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user" 

class UserRead(UserBase):
    id: int
    is_active: bool
    role: Optional[str] = None 
    name: Optional[str] = None
    status: Optional[str] = None
   

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetForm(BaseModel):
    token: str
    new_password: str
    
class UserUpdateRequest(BaseModel):
    name: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None         # ← Add this line!
    role: Optional[str] = None  # "admin" or "user"
    status: Optional[str] = None  # "active" or "inactive"

class UserListResponse(BaseModel):
    users: List[UserRead]
    total: int

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str