from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.database import get_db
from backend.config import JWT_EXPIRE_MINUTES
from backend.models.user import User
from backend.schemas.user import UserCreate, UserLogin, UserOut, TokenOut
from backend.services.auth_service import (
    hash_password, verify_password, create_token, get_current_user, COOKIE_NAME,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def _set_auth_cookie(response: JSONResponse, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set True in production behind HTTPS
        max_age=JWT_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/register", response_model=TokenOut)
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check existing
    result = await db.execute(
        select(User).where((User.username == data.username) | (User.email == data.email))
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already taken")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name or data.username,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(user.id)
    body = TokenOut(
        access_token=token,
        user=UserOut(id=user.id, username=user.username, email=user.email,
                     display_name=user.display_name, created_at=user.created_at),
    )
    response = JSONResponse(content=body.model_dump(mode="json"))
    _set_auth_cookie(response, token)
    return response


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.id)
    body = TokenOut(
        access_token=token,
        user=UserOut(id=user.id, username=user.username, email=user.email,
                     display_name=user.display_name, created_at=user.created_at),
    )
    response = JSONResponse(content=body.model_dump(mode="json"))
    _set_auth_cookie(response, token)
    return response


@router.post("/logout")
async def logout():
    response = JSONResponse(content={"ok": True})
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, username=user.username, email=user.email,
                   display_name=user.display_name, created_at=user.created_at)
