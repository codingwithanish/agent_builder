"""Configuration management using pydantic-settings."""

from enum import Enum
from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class AppMode(str, Enum):
    """Application mode."""
    DUMMY = "dummy"
    REAL = "real"


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    BEDROCK = "bedrock"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure-openai"


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # Server Configuration
    port: int = Field(default=5001, description="Server port")
    app_mode: AppMode = Field(default=AppMode.REAL, description="Application mode")
    service_name: str = Field(default="agent-builder-llm-services", description="Service name")
    log_level: str = Field(default="INFO", description="Log level")
    
    # Default LLM Provider
    default_llm_provider: Optional[LLMProvider] = Field(default=None, description="Default LLM provider")
    
    # OpenAI
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    
    # Anthropic
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    
    # Azure OpenAI
    azure_openai_api_key: Optional[str] = Field(default=None, description="Azure OpenAI API key")
    azure_openai_endpoint: Optional[str] = Field(default=None, description="Azure OpenAI endpoint")
    azure_openai_deployment: Optional[str] = Field(default=None, description="Azure OpenAI deployment")
    
    # AWS Bedrock
    bedrock_region: str = Field(default="us-east-1", description="AWS Bedrock region")
    
    # Model Allowlists
    allowed_bedrock_models: List[str] = Field(default_factory=list, description="Allowed Bedrock models")
    allowed_openai_models: List[str] = Field(default_factory=list, description="Allowed OpenAI models")
    allowed_anthropic_models: List[str] = Field(default_factory=list, description="Allowed Anthropic models")
    allowed_azure_models: List[str] = Field(default_factory=list, description="Allowed Azure models")
    
    # Request Limits
    max_tokens_limit: int = Field(default=8192, description="Maximum tokens limit")
    max_message_size: int = Field(default=32768, description="Maximum message size in characters")
    max_schema_size: int = Field(default=8192, description="Maximum JSON schema size in characters")
    
    # Timeouts (seconds)
    request_timeout: int = Field(default=300, description="Request timeout in seconds")
    provider_timeout: int = Field(default=120, description="Provider timeout in seconds")
    
    # CORS
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:4000", "http://localhost:3000"],
        description="CORS origins"
    )
    
    # Observability
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    enable_tracing: bool = Field(default=False, description="Enable tracing")
    metrics_port: int = Field(default=9090, description="Metrics server port")
    
    class Config:
        """Pydantic config."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
    @validator("allowed_bedrock_models", "allowed_openai_models", "allowed_anthropic_models", "allowed_azure_models", pre=True)
    def parse_csv_list(cls, v):
        """Parse comma-separated list from environment."""
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v
    
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from environment."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    def get_allowed_models(self, provider: LLMProvider) -> List[str]:
        """Get allowed models for a provider."""
        model_map = {
            LLMProvider.BEDROCK: self.allowed_bedrock_models,
            LLMProvider.OPENAI: self.allowed_openai_models,
            LLMProvider.ANTHROPIC: self.allowed_anthropic_models,
            LLMProvider.AZURE_OPENAI: self.allowed_azure_models,
        }
        return model_map.get(provider, [])
    
    def is_model_allowed(self, provider: LLMProvider, model: str) -> bool:
        """Check if a model is allowed for a provider."""
        allowed_models = self.get_allowed_models(provider)
        # If no allowlist is configured, allow all models
        if not allowed_models:
            return True
        return model in allowed_models
    
    def has_provider_credentials(self, provider: LLMProvider) -> bool:
        """Check if credentials are available for a provider."""
        credential_map = {
            LLMProvider.OPENAI: bool(self.openai_api_key),
            LLMProvider.ANTHROPIC: bool(self.anthropic_api_key),
            LLMProvider.AZURE_OPENAI: bool(
                self.azure_openai_api_key and 
                self.azure_openai_endpoint and 
                self.azure_openai_deployment
            ),
            LLMProvider.BEDROCK: True,  # Uses AWS SDK credential chain
        }
        return credential_map.get(provider, False)


# Global settings instance
settings = Settings()