"""Credential resolution service."""

from typing import Dict, Optional

from ..core.config import LLMProvider, settings
from ..core.security import validate_api_key_format
from ..domain.interfaces import CredentialResolver
from ..domain.schemas import Credentials
from ..domain.errors import UnauthorizedError, ValidationError, ConfigurationError
from ..utils.headers import (
    extract_provider_from_headers,
    extract_credentials_from_headers,
    extract_config_name_from_headers,
    parse_aws_credentials_from_key,
)


class DefaultCredentialResolver(CredentialResolver):
    """Default implementation of credential resolution."""
    
    async def resolve_credentials(
        self,
        provider: str,
        headers: Dict[str, str],
        config_name: Optional[str] = None,
    ) -> Credentials:
        """Resolve credentials with precedence: headers -> config name -> environment.
        
        Args:
            provider: Provider name
            headers: Request headers
            config_name: Optional config name for upstream lookup
            
        Returns:
            Resolved credentials
            
        Raises:
            UnauthorizedError: If no valid credentials found
            ValidationError: If credentials are invalid format
        """
        try:
            provider_enum = LLMProvider(provider.lower())
        except ValueError:
            raise ValidationError(f"Unsupported provider: {provider}")
        
        # 1. Try headers first (highest precedence)
        credentials = extract_credentials_from_headers(provider_enum, headers)
        if credentials:
            await self.validate_credentials(credentials)
            return credentials
        
        # 2. Try config name from headers (not implemented in this service)
        config_name = config_name or extract_config_name_from_headers(headers)
        if config_name:
            # In a real implementation, this would call the upstream service
            # to resolve config_name to actual credentials
            raise ConfigurationError(
                f"Config name resolution not implemented: {config_name}"
            )
        
        # 3. Fall back to environment variables
        credentials = self._get_credentials_from_environment(provider_enum)
        if credentials:
            await self.validate_credentials(credentials)
            return credentials
        
        raise UnauthorizedError(
            f"No valid credentials found for provider '{provider}'. "
            f"Provide credentials via headers or environment variables."
        )
    
    async def validate_credentials(self, credentials: Credentials) -> bool:
        """Validate credential format and availability.
        
        Args:
            credentials: Credentials to validate
            
        Returns:
            True if credentials are valid
            
        Raises:
            ValidationError: If credentials are invalid
        """
        provider = credentials.provider
        
        if provider == LLMProvider.OPENAI:
            if not credentials.api_key:
                raise ValidationError("OpenAI API key is required")
            if not validate_api_key_format("openai", credentials.api_key):
                raise ValidationError("Invalid OpenAI API key format")
        
        elif provider == LLMProvider.ANTHROPIC:
            if not credentials.api_key:
                raise ValidationError("Anthropic API key is required")
            if not validate_api_key_format("anthropic", credentials.api_key):
                raise ValidationError("Invalid Anthropic API key format")
        
        elif provider == LLMProvider.AZURE_OPENAI:
            if not credentials.api_key:
                raise ValidationError("Azure OpenAI API key is required")
            if not credentials.endpoint:
                raise ValidationError("Azure OpenAI endpoint is required")
            if not credentials.deployment:
                raise ValidationError("Azure OpenAI deployment is required")
            if not validate_api_key_format("azure", credentials.api_key):
                raise ValidationError("Invalid Azure OpenAI API key format")
        
        elif provider == LLMProvider.BEDROCK:
            if credentials.api_key:
                # Validate AWS credentials format
                try:
                    aws_creds = parse_aws_credentials_from_key(credentials.api_key)
                    if not aws_creds.get("access_key_id") or not aws_creds.get("secret_access_key"):
                        raise ValidationError("Invalid AWS credentials format")
                except Exception:
                    raise ValidationError("Invalid AWS credentials format")
        
        return True
    
    def _get_credentials_from_environment(self, provider: LLMProvider) -> Optional[Credentials]:
        """Get credentials from environment variables.
        
        Args:
            provider: LLM provider
            
        Returns:
            Credentials if available in environment
        """
        if provider == LLMProvider.OPENAI and settings.openai_api_key:
            return Credentials(
                provider=provider,
                api_key=settings.openai_api_key,
            )
        
        elif provider == LLMProvider.ANTHROPIC and settings.anthropic_api_key:
            return Credentials(
                provider=provider,
                api_key=settings.anthropic_api_key,
            )
        
        elif provider == LLMProvider.AZURE_OPENAI and all([
            settings.azure_openai_api_key,
            settings.azure_openai_endpoint,
            settings.azure_openai_deployment,
        ]):
            return Credentials(
                provider=provider,
                api_key=settings.azure_openai_api_key,
                endpoint=settings.azure_openai_endpoint,
                deployment=settings.azure_openai_deployment,
            )
        
        elif provider == LLMProvider.BEDROCK:
            # For Bedrock, we rely on AWS SDK credential chain
            # The actual AWS credentials will be resolved by the boto3 client
            return Credentials(
                provider=provider,
                region=settings.bedrock_region,
            )
        
        return None