import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import create_access_token
from app.crud.user import authenticate_user
from authlib.integrations.starlette_client import OAuth
from fastapi.security import OAuth2PasswordRequestForm


router = APIRouter()

oauth = OAuth()
oauth.register(
    name='azure',
    client_id=os.getenv("AZURE_CLIENT_ID"),
    client_secret=os.getenv("AZURE_CLIENT_SECRET"),
    server_metadata_url=f"https://login.microsoftonline.com/{os.getenv('AZURE_TENANT_ID')}/v2.0/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"}
)

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get('/auth/login')
async def login(request: Request):
    redirect_uri = request.url_for('auth_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get('/auth/callback')
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as error:
        return RedirectResponse(url='/login?error=oauth')
    user_info = await oauth.google.parse_id_token(request, token)
    email = user_info['email']

    # --- Upsert user (create if not exist, else get)
    user = get_user_by_email(db, email)
    if not user:
        # Minimal user creation; expand as needed.
        user = create_user(db, {
            'email': email,
            'hashed_password': 'oauth2_user',  # You can store a dummy hash here
            'is_active': True,
            'role': 'user',
            'is_verified': True,
        })
    # Issue JWT for local API use
    access_token = create_access_token({"sub": user.email})
    # Redirect with token in URL fragment (recommended for SPA)
    frontend_url = "http://localhost:5173/dashboard"
    return RedirectResponse(f"{frontend_url}#token={access_token}")