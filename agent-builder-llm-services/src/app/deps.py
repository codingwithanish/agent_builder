"""FastAPI dependencies for dependency injection."""

from typing import Dict

from fastapi import Depends, Header, Request

from ..core.config import AppMode, settings
from ..services.invoke import InvokeService
from ..services.stream import StreamService
from ..services.json_enforcer import DefaultJSONEnforcer
from ..services.credential_resolver import DefaultCredentialResolver


def get_invoke_service() -> InvokeService:
    """Get invoke service instance."""
    return InvokeService()


def get_stream_service() -> StreamService:
    """Get stream service instance."""
    return StreamService()


def get_json_enforcer() -> DefaultJSONEnforcer:
    """Get JSON enforcer instance."""
    return DefaultJSONEnforcer()


def get_credential_resolver() -> DefaultCredentialResolver:
    """Get credential resolver instance."""
    return DefaultCredentialResolver()


def get_app_mode() -> AppMode:
    """Get current application mode."""
    return settings.app_mode


def get_request_headers(request: Request) -> Dict[str, str]:
    """Extract headers from request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Dictionary of headers
    """
    return dict(request.headers)


def get_request_id(x_request_id: str = Header(None)) -> str:
    """Get or generate request ID.
    
    Args:
        x_request_id: Request ID from header
        
    Returns:
        Request ID string
    """
    if x_request_id:
        return x_request_id
    
    import uuid
    return str(uuid.uuid4())


def verify_content_type(request: Request) -> None:
    """Verify request content type for JSON endpoints.
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: If content type is invalid
    """
    from fastapi import HTTPException
    
    content_type = request.headers.get("content-type", "")
    
    if not content_type.startswith("application/json"):
        raise HTTPException(
            status_code=415,
            detail="Content-Type must be application/json"
        )