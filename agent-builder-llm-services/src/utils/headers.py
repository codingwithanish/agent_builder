"""Header parsing utilities for credential resolution."""

from typing import Dict, Optional

from ..core.config import LLMProvider
from ..domain.schemas import Credentials
from ..domain.errors import ValidationError


def extract_provider_from_headers(headers: Dict[str, str]) -> Optional[LLMProvider]:
    """Extract LLM provider from headers.
    
    Args:
        headers: Request headers
        
    Returns:
        LLM provider if found in headers
    """
    provider_header = headers.get("x-llm-provider", "").lower()
    if not provider_header:
        return None
    
    try:
        return LLMProvider(provider_header)
    except ValueError:
        raise ValidationError(f"Unsupported provider: {provider_header}")


def extract_credentials_from_headers(provider: LLMProvider, headers: Dict[str, str]) -> Optional[Credentials]:
    """Extract credentials from headers for a specific provider.
    
    Args:
        provider: LLM provider
        headers: Request headers
        
    Returns:
        Credentials if found in headers
    """
    # Convert headers to lowercase for case-insensitive lookup
    headers_lower = {k.lower(): v for k, v in headers.items()}
    
    if provider == LLMProvider.BEDROCK:
        access_key = headers_lower.get("x-aws-access-key-id")
        secret_key = headers_lower.get("x-aws-secret-access-key")
        session_token = headers_lower.get("x-aws-session-token")
        region = headers_lower.get("x-aws-region")
        
        if access_key and secret_key:
            return Credentials(
                provider=provider,
                api_key=f"{access_key}:{secret_key}" + (f":{session_token}" if session_token else ""),
                region=region,
            )
    
    elif provider == LLMProvider.OPENAI:
        api_key = headers_lower.get("x-openai-api-key")
        if api_key:
            return Credentials(
                provider=provider,
                api_key=api_key,
            )
    
    elif provider == LLMProvider.ANTHROPIC:
        api_key = headers_lower.get("x-anthropic-api-key")
        if api_key:
            return Credentials(
                provider=provider,
                api_key=api_key,
            )
    
    elif provider == LLMProvider.AZURE_OPENAI:
        api_key = headers_lower.get("x-azure-openai-api-key")
        endpoint = headers_lower.get("x-azure-openai-endpoint")
        deployment = headers_lower.get("x-azure-openai-deployment")
        
        if api_key and endpoint and deployment:
            return Credentials(
                provider=provider,
                api_key=api_key,
                endpoint=endpoint,
                deployment=deployment,
            )
    
    return None


def extract_model_from_headers(headers: Dict[str, str]) -> Optional[str]:
    """Extract default model from headers.
    
    Args:
        headers: Request headers
        
    Returns:
        Model name if found in headers
    """
    return headers.get("x-llm-model")


def extract_config_name_from_headers(headers: Dict[str, str]) -> Optional[str]:
    """Extract config name for upstream lookup.
    
    Args:
        headers: Request headers
        
    Returns:
        Config name if found in headers
    """
    return headers.get("x-llm-config-name")


def extract_request_id_from_headers(headers: Dict[str, str]) -> Optional[str]:
    """Extract request ID from headers.
    
    Args:
        headers: Request headers
        
    Returns:
        Request ID if found in headers
    """
    return headers.get("x-request-id")


def extract_idempotency_key_from_headers(headers: Dict[str, str]) -> Optional[str]:
    """Extract idempotency key from headers.
    
    Args:
        headers: Request headers
        
    Returns:
        Idempotency key if found in headers
    """
    return headers.get("x-idempotency-key")


def validate_required_headers(provider: LLMProvider, headers: Dict[str, str]) -> None:
    """Validate that required headers are present for a provider.
    
    Args:
        provider: LLM provider
        headers: Request headers
        
    Raises:
        ValidationError: If required headers are missing
    """
    headers_lower = {k.lower(): v for k, v in headers.items()}
    
    if provider == LLMProvider.BEDROCK:
        required = ["x-aws-access-key-id", "x-aws-secret-access-key"]
        missing = [h for h in required if not headers_lower.get(h)]
        if missing:
            raise ValidationError(f"Missing required headers for Bedrock: {missing}")
    
    elif provider == LLMProvider.OPENAI:
        if not headers_lower.get("x-openai-api-key"):
            raise ValidationError("Missing required header for OpenAI: x-openai-api-key")
    
    elif provider == LLMProvider.ANTHROPIC:
        if not headers_lower.get("x-anthropic-api-key"):
            raise ValidationError("Missing required header for Anthropic: x-anthropic-api-key")
    
    elif provider == LLMProvider.AZURE_OPENAI:
        required = ["x-azure-openai-api-key", "x-azure-openai-endpoint", "x-azure-openai-deployment"]
        missing = [h for h in required if not headers_lower.get(h)]
        if missing:
            raise ValidationError(f"Missing required headers for Azure OpenAI: {missing}")


def parse_aws_credentials_from_key(api_key: str) -> Dict[str, str]:
    """Parse AWS credentials from composite API key.
    
    Args:
        api_key: Composite key in format "access_key:secret_key[:session_token]"
        
    Returns:
        Dictionary with parsed AWS credentials
    """
    parts = api_key.split(":")
    if len(parts) < 2:
        raise ValidationError("Invalid AWS credentials format")
    
    credentials = {
        "access_key_id": parts[0],
        "secret_access_key": parts[1],
    }
    
    if len(parts) > 2:
        credentials["session_token"] = parts[2]
    
    return credentials


def sanitize_headers_for_logging(headers: Dict[str, str]) -> Dict[str, str]:
    """Sanitize headers for safe logging by redacting sensitive values.
    
    Args:
        headers: Request headers
        
    Returns:
        Headers with sensitive values redacted
    """
    sensitive_patterns = [
        "key", "token", "secret", "password", "credential", "auth"
    ]
    
    sanitized = {}
    for key, value in headers.items():
        key_lower = key.lower()
        if any(pattern in key_lower for pattern in sensitive_patterns):
            sanitized[key] = "[REDACTED]"
        else:
            sanitized[key] = value
    
    return sanitized