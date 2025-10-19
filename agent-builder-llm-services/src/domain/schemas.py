"""Pydantic models for requests and responses."""

from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    BEDROCK = "bedrock"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure-openai"


class MessageRole(str, Enum):
    """Message roles in conversations."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class Message(BaseModel):
    """Chat message."""
    role: MessageRole
    content: str
    
    @validator("content")
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Message content cannot be empty")
        return v


class LLMInvokeRequest(BaseModel):
    """Request for LLM invocation."""
    provider: LLMProvider
    model: str
    messages: List[Message]
    json_schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for validation")
    temperature: Optional[float] = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=4000, gt=0)
    strict: bool = Field(default=True, description="Whether to enforce strict schema validation")
    extra: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Provider-specific parameters")
    
    @validator("messages")
    def messages_not_empty(cls, v):
        if not v:
            raise ValueError("Messages list cannot be empty")
        return v
    
    @validator("model")
    def model_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Model cannot be empty")
        return v


class LLMStreamRequest(LLMInvokeRequest):
    """Request for streaming LLM invocation."""
    pass


class UsageInfo(BaseModel):
    """Token usage information."""
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class ValidationResult(BaseModel):
    """JSON schema validation result."""
    valid: bool
    errors: Optional[List[Dict[str, Any]]] = None


class LLMInvokeResponse(BaseModel):
    """Response from LLM invocation."""
    ok: bool
    provider: str
    model: str
    json_data: Optional[Dict[str, Any]] = Field(None, alias="json")
    raw_content: Optional[str] = None
    validation: Optional[ValidationResult] = None
    usage: Optional[UsageInfo] = None
    meta: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    error_code: Optional[str] = None


class StreamEvent(BaseModel):
    """Streaming event."""
    event: str
    data: Union[str, Dict[str, Any]]


class TestConnectionRequest(BaseModel):
    """Request to test provider connection."""
    provider: LLMProvider
    api_key: Optional[str] = None
    region: Optional[str] = None
    endpoint: Optional[str] = None
    config_name: Optional[str] = None


class TestConnectionResponse(BaseModel):
    """Response from connection test."""
    ok: bool
    message: Optional[str] = None
    provider: str
    details: Optional[Dict[str, Any]] = None


class ValidateJSONRequest(BaseModel):
    """Request to validate/repair JSON."""
    text: str
    json_schema: Optional[Dict[str, Any]] = None
    
    @validator("text")
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Text cannot be empty")
        return v


class ValidateJSONResponse(BaseModel):
    """Response from JSON validation/repair."""
    ok: bool
    json_data: Optional[Dict[str, Any]] = Field(None, alias="json")
    validation: Optional[ValidationResult] = None
    repaired: bool = False
    error: Optional[str] = None


class ListModelsResponse(BaseModel):
    """Response from list models endpoint."""
    provider: str
    models: List[str]
    region: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    timestamp: str
    version: str = "1.0.0"
    app_mode: str


class Credentials(BaseModel):
    """Provider credentials."""
    provider: LLMProvider
    api_key: Optional[str] = None
    region: Optional[str] = None
    endpoint: Optional[str] = None
    deployment: Optional[str] = None
    
    model_config = {"extra": "forbid"}


class ProviderConfig(BaseModel):
    """Provider configuration."""
    provider: LLMProvider
    model: str
    credentials: Credentials
    extra_params: Optional[Dict[str, Any]] = None