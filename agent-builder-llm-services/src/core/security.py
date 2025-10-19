"""Security utilities for handling credentials and sensitive data."""

import re
from typing import Any, Dict


def redact_sensitive_data(data: Any, patterns: list[str] = None) -> Any:
    """Redact sensitive data from logs and responses.
    
    Args:
        data: Data to redact (dict, str, or other)
        patterns: List of regex patterns to match sensitive keys
        
    Returns:
        Data with sensitive values redacted
    """
    if patterns is None:
        patterns = [
            r".*key.*",
            r".*token.*",
            r".*secret.*",
            r".*password.*",
            r".*credential.*",
            r".*auth.*",
        ]
    
    if isinstance(data, dict):
        return {
            key: redact_sensitive_data(value, patterns) 
            if not _is_sensitive_key(key, patterns) 
            else "[REDACTED]"
            for key, value in data.items()
        }
    elif isinstance(data, list):
        return [redact_sensitive_data(item, patterns) for item in data]
    elif isinstance(data, str):
        return _redact_sensitive_strings(data)
    else:
        return data


def _is_sensitive_key(key: str, patterns: list[str]) -> bool:
    """Check if a key matches sensitive patterns."""
    key_lower = key.lower()
    return any(re.match(pattern, key_lower, re.IGNORECASE) for pattern in patterns)


def _redact_sensitive_strings(text: str) -> str:
    """Redact known sensitive patterns in strings."""
    # Common API key patterns
    patterns = [
        (r"sk-[a-zA-Z0-9]{48}", "[REDACTED-OPENAI-KEY]"),
        (r"xoxb-[a-zA-Z0-9-]+", "[REDACTED-SLACK-TOKEN]"),
        (r"ghp_[a-zA-Z0-9]{36}", "[REDACTED-GITHUB-TOKEN]"),
        (r"AKIA[0-9A-Z]{16}", "[REDACTED-AWS-ACCESS-KEY]"),
        (r"ya29\.[a-zA-Z0-9_-]+", "[REDACTED-GOOGLE-TOKEN]"),
    ]
    
    result = text
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result)
    
    return result


def extract_bearer_token(authorization_header: str) -> str | None:
    """Extract bearer token from Authorization header."""
    if not authorization_header:
        return None
    
    if authorization_header.startswith("Bearer "):
        return authorization_header[7:]
    
    return None


def validate_api_key_format(provider: str, api_key: str) -> bool:
    """Validate API key format for different providers.
    
    Args:
        provider: Provider name (openai, anthropic, etc.)
        api_key: API key to validate
        
    Returns:
        True if format is valid
    """
    if not api_key:
        return False
    
    # Basic validation patterns
    patterns = {
        "openai": r"sk-[a-zA-Z0-9]{48,}",
        "anthropic": r"sk-ant-[a-zA-Z0-9_-]+",
        "azure": r"[a-zA-Z0-9]{32}",  # Azure keys are typically 32 chars
    }
    
    pattern = patterns.get(provider.lower())
    if pattern:
        return bool(re.match(pattern, api_key))
    
    # For unknown providers, just check it's not empty and reasonable length
    return len(api_key) >= 8


def sanitize_request_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize request data for logging."""
    sanitized = data.copy()
    
    # Remove or redact sensitive fields
    sensitive_fields = [
        "api_key", "apiKey", "token", "secret", "password", 
        "credential", "authorization", "x-api-key"
    ]
    
    for field in sensitive_fields:
        if field in sanitized:
            sanitized[field] = "[REDACTED]"
    
    # Redact nested sensitive data
    return redact_sensitive_data(sanitized)