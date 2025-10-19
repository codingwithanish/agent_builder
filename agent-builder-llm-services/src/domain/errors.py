"""Error taxonomy for the LLM services."""

from typing import Any, Dict, Optional


class LLMServiceError(Exception):
    """Base exception for LLM service errors."""
    
    def __init__(
        self, 
        message: str, 
        error_code: str = "llm_error",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}


class ValidationError(LLMServiceError):
    """Request validation error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="validation_error",
            status_code=400,
            details=details
        )


class UnauthorizedError(LLMServiceError):
    """Authentication/authorization error."""
    
    def __init__(self, message: str = "Unauthorized", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="unauthorized",
            status_code=401,
            details=details
        )


class ModelNotAllowedError(LLMServiceError):
    """Model not in allowlist error."""
    
    def __init__(self, provider: str, model: str, allowed_models: list[str]):
        message = f"Model '{model}' not allowed for provider '{provider}'"
        super().__init__(
            message=message,
            error_code="model_not_allowed",
            status_code=403,
            details={
                "provider": provider,
                "model": model,
                "allowed_models": allowed_models
            }
        )


class RateLimitedError(LLMServiceError):
    """Rate limit exceeded error."""
    
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="rate_limited",
            status_code=429,
            details=details
        )


class ProviderUnavailableError(LLMServiceError):
    """Provider service unavailable error."""
    
    def __init__(self, provider: str, message: str = None, details: Optional[Dict[str, Any]] = None):
        if message is None:
            message = f"Provider '{provider}' is unavailable"
        super().__init__(
            message=message,
            error_code="provider_unavailable",
            status_code=502,
            details={"provider": provider, **(details or {})}
        )


class TimeoutError(LLMServiceError):
    """Request timeout error."""
    
    def __init__(self, message: str = "Request timeout", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="timeout",
            status_code=503,
            details=details
        )


class JSONParsingError(LLMServiceError):
    """JSON parsing/validation error."""
    
    def __init__(
        self, 
        message: str, 
        raw_content: str = None,
        validation_errors: list = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="json_parsing_error",
            status_code=422,
            details={
                "raw_content": raw_content,
                "validation_errors": validation_errors,
                **(details or {})
            }
        )


class ProviderError(LLMServiceError):
    """Error from LLM provider."""
    
    def __init__(
        self, 
        provider: str, 
        message: str,
        provider_error_code: str = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"Provider '{provider}' error: {message}",
            error_code="provider_error",
            status_code=502,
            details={
                "provider": provider,
                "provider_error_code": provider_error_code,
                **(details or {})
            }
        )


class ConfigurationError(LLMServiceError):
    """Configuration error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="configuration_error",
            status_code=500,
            details=details
        )