"""Non-streaming LLM invocation service."""

from typing import Dict

from ..core.config import LLMProvider, settings
from ..core.observability import get_logger, track_llm_invoke, track_tokens
from ..domain.interfaces import LlmService
from ..domain.schemas import LLMInvokeRequest, LLMInvokeResponse
from ..domain.errors import ValidationError, ModelNotAllowedError, ConfigurationError
from ..providers.openai import OpenAIClient
from ..providers.anthropic import AnthropicClient
from ..providers.bedrock import BedrockClient
from ..providers.azure_openai import AzureOpenAIClient
from ..services.credential_resolver import DefaultCredentialResolver
from ..services.json_enforcer import DefaultJSONEnforcer


class InvokeService(LlmService):
    """Service for non-streaming LLM invocations."""
    
    def __init__(self):
        """Initialize invoke service."""
        self.logger = get_logger(self.__class__.__name__)
        self.credential_resolver = DefaultCredentialResolver()
        self.json_enforcer = DefaultJSONEnforcer()
    
    async def invoke(self, request: LLMInvokeRequest, headers: Dict[str, str]) -> LLMInvokeResponse:
        """Invoke LLM and return JSON response.
        
        Args:
            request: LLM invocation request
            headers: Request headers for credential resolution
            
        Returns:
            LLM response with JSON content
        """
        self.logger.info(
            "Starting LLM invocation",
            provider=request.provider.value,
            model=request.model,
            message_count=len(request.messages),
        )
        
        try:
            # Validate request
            await self._validate_request(request)
            
            # Resolve credentials
            credentials = await self.credential_resolver.resolve_credentials(
                provider=request.provider.value,
                headers=headers,
            )
            
            # Get LLM client
            client = self._create_client(request.provider, credentials)
            
            # Enhance messages with JSON instructions
            enhanced_messages = self.json_enforcer.add_json_instructions(request.messages)
            
            # Track invocation
            with track_llm_invoke(request.provider.value, request.model):
                # Invoke LLM
                response = await client.invoke(
                    messages=enhanced_messages,
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    json_schema=request.json_schema,
                    extra_params=request.extra,
                )
                
                # If we got raw content instead of parsed JSON, process it
                if response.raw_content and not response.json:
                    json_result = await self.json_enforcer.parse_and_validate(
                        content=response.raw_content,
                        json_schema=request.json_schema,
                        strict=request.strict,
                    )
                    
                    response.json = json_result.get("json")
                    response.validation = json_result.get("validation")
                    if json_result.get("repaired"):
                        response.meta = response.meta or {}
                        response.meta["repaired"] = True
                
                # Track token usage
                if response.usage:
                    track_tokens(
                        provider=request.provider.value,
                        model=request.model,
                        input_tokens=response.usage.input_tokens or 0,
                        output_tokens=response.usage.output_tokens or 0,
                    )
                
                self.logger.info(
                    "LLM invocation completed",
                    provider=request.provider.value,
                    model=request.model,
                    status="success",
                    json_valid=response.validation.valid if response.validation else None,
                )
                
                return response
                
        except Exception as e:
            self.logger.error(
                "LLM invocation failed",
                provider=request.provider.value,
                model=request.model,
                error=str(e),
            )
            
            # Return error response for non-fatal errors
            if not isinstance(e, (ValidationError, ModelNotAllowedError)):
                return LLMInvokeResponse(
                    ok=False,
                    provider=request.provider.value,
                    model=request.model,
                    error=str(e),
                    error_code=getattr(e, 'error_code', 'invocation_error'),
                )
            
            raise
    
    async def _validate_request(self, request: LLMInvokeRequest) -> None:
        """Validate LLM invocation request.
        
        Args:
            request: Request to validate
            
        Raises:
            ValidationError: If request is invalid
            ModelNotAllowedError: If model is not allowed
        """
        # Check if provider has credentials available
        if not settings.has_provider_credentials(request.provider):
            raise ValidationError(
                f"No credentials configured for provider '{request.provider.value}'"
            )
        
        # Check model allowlist
        if not settings.is_model_allowed(request.provider, request.model):
            allowed_models = settings.get_allowed_models(request.provider)
            raise ModelNotAllowedError(
                provider=request.provider.value,
                model=request.model,
                allowed_models=allowed_models,
            )
        
        # Validate message size
        total_content_length = sum(len(msg.content) for msg in request.messages)
        if total_content_length > settings.max_message_size:
            raise ValidationError(
                f"Total message size {total_content_length} exceeds maximum {settings.max_message_size}"
            )
        
        # Validate max tokens
        if request.max_tokens and request.max_tokens > settings.max_tokens_limit:
            raise ValidationError(
                f"Max tokens {request.max_tokens} exceeds limit {settings.max_tokens_limit}"
            )
        
        # Validate JSON schema size if provided
        if request.json_schema:
            import json
            schema_size = len(json.dumps(request.json_schema))
            if schema_size > settings.max_schema_size:
                raise ValidationError(
                    f"JSON schema size {schema_size} exceeds maximum {settings.max_schema_size}"
                )
    
    def _create_client(self, provider: LLMProvider, credentials):
        """Create LLM client for the specified provider.
        
        Args:
            provider: LLM provider
            credentials: Provider credentials
            
        Returns:
            LLM client instance
            
        Raises:
            ConfigurationError: If provider is not supported
        """
        if provider == LLMProvider.OPENAI:
            return OpenAIClient(credentials)
        elif provider == LLMProvider.ANTHROPIC:
            return AnthropicClient(credentials)
        elif provider == LLMProvider.BEDROCK:
            return BedrockClient(credentials)
        elif provider == LLMProvider.AZURE_OPENAI:
            return AzureOpenAIClient(credentials)
        else:
            raise ConfigurationError(f"Unsupported provider: {provider.value}")
    
    async def stream(self, request, headers):
        """Not implemented in invoke service - use streaming service."""
        raise NotImplementedError("Use StreamService for streaming responses")