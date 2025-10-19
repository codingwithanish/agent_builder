"""Base provider adapter implementation."""

from abc import ABC
from typing import Any, AsyncIterator, Dict, List, Optional

from ..core.observability import get_logger, track_llm_invoke
from ..domain.interfaces import LlmClient
from ..domain.schemas import (
    Credentials,
    LLMInvokeResponse,
    Message,
    StreamEvent,
    UsageInfo,
)
from ..domain.errors import ProviderError, TimeoutError


class BaseLlmClient(LlmClient, ABC):
    """Base implementation for LLM provider clients."""
    
    def __init__(self, credentials: Credentials):
        """Initialize base client.
        
        Args:
            credentials: Provider credentials
        """
        self.credentials = credentials
        self.logger = get_logger(self.__class__.__name__)
    
    async def invoke(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> LLMInvokeResponse:
        """Base invoke implementation with error handling and metrics."""
        with track_llm_invoke(self.provider_name, model):
            try:
                self.logger.info(
                    "Starting LLM invocation",
                    provider=self.provider_name,
                    model=model,
                    message_count=len(messages),
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                
                response = await self._invoke_implementation(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_schema=json_schema,
                    extra_params=extra_params,
                )
                
                self.logger.info(
                    "LLM invocation completed",
                    provider=self.provider_name,
                    model=model,
                    status="success",
                    input_tokens=response.usage.input_tokens if response.usage else None,
                    output_tokens=response.usage.output_tokens if response.usage else None,
                )
                
                return response
                
            except Exception as e:
                self.logger.error(
                    "LLM invocation failed",
                    provider=self.provider_name,
                    model=model,
                    error=str(e),
                )
                raise self._handle_provider_error(e)
    
    async def stream(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[StreamEvent]:
        """Base stream implementation with error handling."""
        try:
            self.logger.info(
                "Starting LLM streaming",
                provider=self.provider_name,
                model=model,
                message_count=len(messages),
            )
            
            async for event in self._stream_implementation(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                json_schema=json_schema,
                extra_params=extra_params,
            ):
                yield event
                
        except Exception as e:
            self.logger.error(
                "LLM streaming failed",
                provider=self.provider_name,
                model=model,
                error=str(e),
            )
            # Yield error event
            yield StreamEvent(
                event="error",
                data={"error": str(e), "provider": self.provider_name}
            )
            raise self._handle_provider_error(e)
    
    def _handle_provider_error(self, error: Exception) -> Exception:
        """Handle and convert provider-specific errors.
        
        Args:
            error: Original error
            
        Returns:
            Converted error
        """
        error_str = str(error).lower()
        
        # Check for timeout errors
        if any(keyword in error_str for keyword in ["timeout", "timed out", "deadline"]):
            return TimeoutError(f"Provider request timed out: {error}")
        
        # Convert to provider error
        return ProviderError(
            provider=self.provider_name,
            message=str(error),
            provider_error_code=getattr(error, 'code', None),
        )
    
    def _create_usage_info(
        self,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
    ) -> UsageInfo:
        """Create usage info object.
        
        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            
        Returns:
            Usage info object
        """
        total_tokens = None
        if input_tokens is not None and output_tokens is not None:
            total_tokens = input_tokens + output_tokens
        
        return UsageInfo(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
        )
    
    # Abstract methods that subclasses must implement
    
    async def _invoke_implementation(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> LLMInvokeResponse:
        """Provider-specific invoke implementation.
        
        Subclasses must implement this method.
        """
        raise NotImplementedError
    
    async def _stream_implementation(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[StreamEvent]:
        """Provider-specific stream implementation.
        
        Subclasses must implement this method.
        """
        raise NotImplementedError
        # This makes the method an async generator
        yield  # pragma: no cover
    
    async def test_connection(self) -> bool:
        """Default connection test implementation."""
        try:
            # Test with a minimal request
            test_messages = [Message(role="user", content="Hello")]
            await self._invoke_implementation(
                messages=test_messages,
                model=await self._get_default_test_model(),
                max_tokens=1,
            )
            return True
        except Exception as e:
            self.logger.warning(
                "Connection test failed",
                provider=self.provider_name,
                error=str(e),
            )
            return False
    
    async def _get_default_test_model(self) -> str:
        """Get a default model for connection testing.
        
        Subclasses should override this if needed.
        """
        models = await self.list_models()
        if models:
            return models[0]
        return "default"