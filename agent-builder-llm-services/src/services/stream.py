"""Streaming LLM invocation service with SSE support."""

from typing import AsyncIterator, Dict

from ..core.config import LLMProvider, settings
from ..core.observability import get_logger, track_llm_invoke, track_tokens
from ..domain.interfaces import LlmService
from ..domain.schemas import LLMInvokeRequest, StreamEvent
from ..domain.errors import ValidationError, ModelNotAllowedError, ConfigurationError
from ..providers.openai import OpenAIClient
from ..providers.anthropic import AnthropicClient
from ..providers.bedrock import BedrockClient
from ..providers.azure_openai import AzureOpenAIClient
from ..services.credential_resolver import DefaultCredentialResolver
from ..services.json_enforcer import DefaultJSONEnforcer


class StreamService(LlmService):
    """Service for streaming LLM invocations with SSE support."""
    
    def __init__(self):
        """Initialize stream service."""
        self.logger = get_logger(self.__class__.__name__)
        self.credential_resolver = DefaultCredentialResolver()
        self.json_enforcer = DefaultJSONEnforcer()
    
    async def stream(
        self, 
        request: LLMInvokeRequest, 
        headers: Dict[str, str]
    ) -> AsyncIterator[StreamEvent]:
        """Stream LLM response with SSE events.
        
        Args:
            request: LLM invocation request
            headers: Request headers for credential resolution
            
        Yields:
            Stream events
        """
        self.logger.info(
            "Starting LLM streaming",
            provider=request.provider.value,
            model=request.model,
            message_count=len(request.messages),
        )
        
        accumulated_tokens = {"input": 0, "output": 0}
        
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
            
            # Start streaming
            self.logger.debug("Starting stream from provider", provider=request.provider.value)
            
            async for event in client.stream(
                messages=enhanced_messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                json_schema=request.json_schema,
                extra_params=request.extra,
            ):
                # Track token usage from usage events
                if event.event == "usage" and isinstance(event.data, dict):
                    input_tokens = event.data.get("inputTokens", 0)
                    output_tokens = event.data.get("outputTokens", 0)
                    
                    track_tokens(
                        provider=request.provider.value,
                        model=request.model,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )
                    
                    accumulated_tokens["input"] = input_tokens
                    accumulated_tokens["output"] = output_tokens
                
                # Process final JSON with validation if schema provided
                if event.event == "final_json" and request.json_schema:
                    try:
                        # Validate final JSON against schema
                        if isinstance(event.data, dict):
                            json_result = await self.json_enforcer.parse_and_validate(
                                content=str(event.data),  # Convert back to string for validation
                                json_schema=request.json_schema,
                                strict=request.strict,
                            )
                            
                            # Emit validation result
                            yield StreamEvent(
                                event="validation",
                                data={
                                    "valid": json_result["validation"].valid,
                                    "errors": json_result["validation"].errors,
                                }
                            )
                    except Exception as e:
                        self.logger.warning("Final JSON validation failed", error=str(e))
                        
                        if request.strict:
                            yield StreamEvent(
                                event="error",
                                data={
                                    "error": f"JSON validation failed: {str(e)}",
                                    "error_code": "validation_error",
                                }
                            )
                            return
                
                # Yield the event
                yield event
                
                # Break on done or error events
                if event.event in ["done", "error"]:
                    break
            
            self.logger.info(
                "LLM streaming completed",
                provider=request.provider.value,
                model=request.model,
                status="success",
                input_tokens=accumulated_tokens["input"],
                output_tokens=accumulated_tokens["output"],
            )
            
        except Exception as e:
            self.logger.error(
                "LLM streaming failed",
                provider=request.provider.value,
                model=request.model,
                error=str(e),
            )
            
            # Emit error event
            yield StreamEvent(
                event="error",
                data={
                    "error": str(e),
                    "error_code": getattr(e, 'error_code', 'streaming_error'),
                    "provider": request.provider.value,
                }
            )
    
    async def _validate_request(self, request: LLMInvokeRequest) -> None:
        """Validate LLM streaming request.
        
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
    
    async def invoke(self, request, headers):
        """Not implemented in stream service - use invoke service."""
        raise NotImplementedError("Use InvokeService for non-streaming responses")
    
    async def create_sse_event_generator(
        self, 
        request: LLMInvokeRequest, 
        headers: Dict[str, str]
    ) -> AsyncIterator[Dict[str, str]]:
        """Create SSE-compatible event generator.
        
        Args:
            request: LLM invocation request
            headers: Request headers
            
        Yields:
            SSE event dictionaries
        """
        async for event in self.stream(request, headers):
            # Convert StreamEvent to SSE format
            sse_event = {
                "event": event.event,
                "data": event.data if isinstance(event.data, str) else str(event.data),
            }
            
            # Add retry for certain events
            if event.event in ["error", "done"]:
                sse_event["retry"] = "3000"  # 3 seconds
            
            yield sse_event