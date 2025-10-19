"""Interfaces and abstract base classes."""

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict, List, Optional

from .schemas import (
    Credentials, 
    LLMInvokeRequest, 
    LLMInvokeResponse, 
    Message, 
    StreamEvent, 
    UsageInfo
)


class LlmClient(ABC):
    """Abstract base class for LLM provider clients."""
    
    @abstractmethod
    async def invoke(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> LLMInvokeResponse:
        """Invoke the LLM with messages and return response.
        
        Args:
            messages: List of conversation messages
            model: Model identifier
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            json_schema: Optional JSON schema for structured output
            extra_params: Provider-specific parameters
            
        Returns:
            LLM response with generated content
        """
        pass
    
    @abstractmethod
    async def stream(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[StreamEvent]:
        """Stream LLM response as events.
        
        Args:
            messages: List of conversation messages
            model: Model identifier
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            json_schema: Optional JSON schema for structured output
            extra_params: Provider-specific parameters
            
        Yields:
            Stream events with partial responses
        """
        pass
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Test connection to the provider.
        
        Returns:
            True if connection is successful
        """
        pass
    
    @abstractmethod
    async def list_models(self) -> List[str]:
        """List available models.
        
        Returns:
            List of model identifiers
        """
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Get provider name."""
        pass


class JSONEnforcer(ABC):
    """Abstract base class for JSON enforcement strategies."""
    
    @abstractmethod
    def add_json_instructions(self, messages: List[Message]) -> List[Message]:
        """Add JSON formatting instructions to messages.
        
        Args:
            messages: Original messages
            
        Returns:
            Messages with JSON instructions added
        """
        pass
    
    @abstractmethod
    async def parse_and_validate(
        self,
        content: str,
        json_schema: Optional[Dict[str, Any]] = None,
        strict: bool = True,
    ) -> Dict[str, Any]:
        """Parse content as JSON and validate against schema.
        
        Args:
            content: Raw content to parse
            json_schema: Optional JSON schema for validation
            strict: Whether to raise error on validation failure
            
        Returns:
            Dictionary with parsed JSON and validation results
        """
        pass
    
    @abstractmethod
    async def repair_json(self, content: str) -> str:
        """Attempt to repair malformed JSON.
        
        Args:
            content: Malformed JSON content
            
        Returns:
            Repaired JSON string
        """
        pass


class CredentialResolver(ABC):
    """Abstract base class for credential resolution."""
    
    @abstractmethod
    async def resolve_credentials(
        self,
        provider: str,
        headers: Dict[str, str],
        config_name: Optional[str] = None,
    ) -> Credentials:
        """Resolve credentials for a provider.
        
        Args:
            provider: Provider name
            headers: Request headers
            config_name: Optional config name for upstream lookup
            
        Returns:
            Resolved credentials
        """
        pass
    
    @abstractmethod
    async def validate_credentials(self, credentials: Credentials) -> bool:
        """Validate credentials.
        
        Args:
            credentials: Credentials to validate
            
        Returns:
            True if credentials are valid
        """
        pass


class LlmService(ABC):
    """Abstract base class for LLM service orchestration."""
    
    @abstractmethod
    async def invoke(self, request: LLMInvokeRequest, headers: Dict[str, str]) -> LLMInvokeResponse:
        """Invoke LLM and return JSON response.
        
        Args:
            request: LLM invocation request
            headers: Request headers for credential resolution
            
        Returns:
            LLM response with JSON content
        """
        pass
    
    @abstractmethod
    async def stream(
        self, 
        request: LLMInvokeRequest, 
        headers: Dict[str, str]
    ) -> AsyncIterator[StreamEvent]:
        """Stream LLM response.
        
        Args:
            request: LLM invocation request
            headers: Request headers for credential resolution
            
        Yields:
            Stream events
        """
        pass


class DummyProvider(ABC):
    """Abstract base class for dummy/mock providers."""
    
    @abstractmethod
    async def generate_dummy_response(
        self,
        messages: List[Message],
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate dummy JSON response.
        
        Args:
            messages: Input messages
            json_schema: Optional schema to conform to
            
        Returns:
            Dummy JSON response
        """
        pass
    
    @abstractmethod
    async def generate_dummy_stream(
        self,
        messages: List[Message],
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[StreamEvent]:
        """Generate dummy stream events.
        
        Args:
            messages: Input messages
            json_schema: Optional schema to conform to
            
        Yields:
            Dummy stream events
        """
        pass