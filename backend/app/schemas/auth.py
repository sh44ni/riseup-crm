"""
Authentication Pydantic Schemas
================================
Request and response models for admin login, session management, token issuance,
and staff profile verification.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class LoginRequest(BaseModel):
    """
    Credentials payload for administrative authentication.
    """
    email: str = Field(..., min_length=3, max_length=255, description="Staff or administrator email address")
    password: str = Field(..., min_length=1, description="Account password")

    model_config = ConfigDict(extra="forbid")


class TokenResponse(BaseModel):
    """
    Session token response model.
    """
    token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None

    model_config = ConfigDict(extra="allow")


class UserProfileResponse(BaseModel):
    """
    Authenticated user profile and role/permissions snapshot.
    """
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    permissions: Optional[Union[Dict[str, Any], List[str]]] = None
    is_protected_owner: Optional[bool] = False
    status: Optional[str] = "active"
    last_login_at: Optional[Union[datetime, str]] = None
    created_at: Optional[Union[datetime, str]] = None
    signature_data: Optional[str] = None
    signature_type: Optional[str] = None
    signature_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")


class LoginResponse(BaseModel):
    """
    Successful login response schema.
    """
    ok: bool = True
    token: str
    user: Union[UserProfileResponse, Dict[str, Any]]

    model_config = ConfigDict(extra="allow")


class SessionItem(BaseModel):
    id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    last_seen_at: Optional[str] = None
    created_at: Optional[str] = None
    is_current: bool = False

    model_config = ConfigDict(extra="allow")


class SessionListResponse(BaseModel):
    ok: bool = True
    sessions: List[SessionItem]

    model_config = ConfigDict(extra="allow")


class SessionActionResponse(BaseModel):
    ok: bool = True
    message: Optional[str] = None
    revoked_count: Optional[int] = None

    model_config = ConfigDict(extra="allow")

