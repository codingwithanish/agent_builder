"""Anthropic provider adapter using LangChain."""

import json
from typing import Any, AsyncIterator, Dict, List, Optional

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from anthropic import AsyncAnthropic

from .base import BaseLlmClient
from ..domain.schemas import (
    Credentials,
    LLMInvokeResponse,
    Message,
    MessageRole,
    StreamEvent,
    UsageInfo,
)
from ..domain.errors import ProviderError, UnauthorizedError


class AnthropicClient(BaseLlmClient):
    """Anthropic provider client using LangChain."""
    
    def __init__(self, credentials: Credentials):
        """Initialize Anthropic client.
        
        Args:
            credentials: Anthropic credentials
        """
        super().__init__(credentials)
        
        if not credentials.api_key:
            raise UnauthorizedError("Anthropic API key is required")
        
        # Initialize LangChain Anthropic client
        self.chat_model = ChatAnthropic(
            api_key=credentials.api_key,
            temperature=0.2,
            timeout=120,
        )
        
        # Initialize direct Anthropic client for additional operations
        self.anthropic_client = AsyncAnthropic(api_key=credentials.api_key)
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "anthropic"
    
    async def _invoke_implementation(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> LLMInvokeResponse:
        """Anthropic-specific invoke implementation."""
        try:
            # Convert messages to LangChain format
            lc_messages = self._convert_messages(messages)
            
            # Configure model
            model_config = {
                "model": model,
                "temperature": temperature or 0.2,
                "max_tokens": max_tokens or 4000,
            }
            
            # Apply extra parameters
            if extra_params:
                model_config.update(extra_params)
            
            # Create configured model
            configured_model = self.chat_model.bind(**model_config)
            
            # For JSON output, use tool-use pattern or JSON parser
            if json_schema:
                # Try tool-use pattern for Claude 3+
                if any(version in model for version in ["claude-3", "claude-3.5"]):
                    try:
                        result = await self._invoke_with_tool_use(
                            configured_model, lc_messages, json_schema
                        )
                        if result:
                            return LLMInvokeResponse(
                                ok=True,
                                provider=self.provider_name,
                                model=model,
                                json=result,
                                validation={"valid": True},
                                usage=self._extract_usage_from_response(None),
                                meta={"finish_reason": "stop"}
                            )
                    except Exception as e:
                        self.logger.warning(
                            "Tool-use pattern failed, falling back to JSON parser",
                            error=str(e)
                        )
            
            # Fallback to JSON parser with enhanced prompting
            enhanced_messages = self._add_json_instructions(lc_messages, json_schema)
            parser = JsonOutputParser()
            chain = configured_model | parser
            
            result = await chain.ainvoke(enhanced_messages)
            
            return LLMInvokeResponse(
                ok=True,
                provider=self.provider_name,
                model=model,
                json=result,
                validation={"valid": True},
                usage=self._extract_usage_from_response(None),
                meta={"finish_reason": "stop"}
            )
            
        except Exception as e:
            self.logger.error(f"Anthropic invocation failed: {e}")
            raise ProviderError(
                provider=self.provider_name,
                message=str(e),
                provider_error_code=getattr(e, 'code', None)
            )
    
    async def _stream_implementation(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[StreamEvent]:
        """Anthropic-specific streaming implementation."""
        try:
            # Convert to Anthropic format
            anthropic_messages = []
            system_message = None
            
            for msg in messages:
                if msg.role == MessageRole.SYSTEM:
                    system_message = msg.content
                else:
                    anthropic_messages.append({
                        "role": msg.role.value,
                        "content": msg.content
                    })
            
            # Add JSON instructions if schema provided
            if json_schema:
                json_instruction = f"\n\nPlease respond with valid JSON that matches this schema: {json.dumps(json_schema)}"
                if anthropic_messages:
                    anthropic_messages[-1]["content"] += json_instruction
            
            kwargs = {
                "model": model,
                "messages": anthropic_messages,
                "temperature": temperature or 0.2,
                "max_tokens": max_tokens or 4000,
                "stream": True,
            }
            
            if system_message:
                kwargs["system"] = system_message
            
            if extra_params:
                kwargs.update(extra_params)
            
            accumulated_content = ""
            
            async with self.anthropic_client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            content = event.delta.text
                            accumulated_content += content
                            
                            # Emit token event
                            yield StreamEvent(event="token", data=content)
                            
                            # Try to emit partial JSON
                            if len(accumulated_content) > 10:
                                try:
                                    if accumulated_content.strip().startswith('{'):
                                        yield StreamEvent(event="partial_json", data=accumulated_content)
                                except Exception:
                                    pass
                    
                    elif event.type == "message_stop":
                        # Emit final JSON
                        if accumulated_content:
                            try:
                                final_json = json.loads(accumulated_content)
                                yield StreamEvent(event="final_json", data=final_json)
                            except json.JSONDecodeError:
                                yield StreamEvent(event="final_json", data={"error": "Invalid JSON", "content": accumulated_content})
                        
                        # Emit usage info
                        if hasattr(stream, 'get_final_message'):
                            final_message = stream.get_final_message()
                            if hasattr(final_message, 'usage'):
                                usage_data = {
                                    "inputTokens": final_message.usage.input_tokens,
                                    "outputTokens": final_message.usage.output_tokens,
                                }
                                yield StreamEvent(event="usage", data=usage_data)
                        
                        yield StreamEvent(event="done", data={"finish_reason": "stop"})
                        break
                        
        except Exception as e:
            self.logger.error(f"Anthropic streaming failed: {e}")
            yield StreamEvent(
                event="error",
                data={"error": str(e), "provider": self.provider_name}
            )
    
    async def test_connection(self) -> bool:
        """Test Anthropic connection."""
        try:
            # Test with a simple message
            response = await self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return True
        except Exception as e:
            self.logger.warning(f"Anthropic connection test failed: {e}")
            return False
    
    async def list_models(self) -> List[str]:
        """List available Anthropic models."""
        # Anthropic doesn't have a models API, return known models
        return [
            "claude-3-5-sonnet-20241022",
            "claude-3-sonnet-20240229",
            "claude-3-opus-20240229",
            "claude-3-haiku-20240307",
        ]
    
    def _convert_messages(self, messages: List[Message]) -> List:
        """Convert domain messages to LangChain messages."""
        lc_messages = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                lc_messages.append(SystemMessage(content=msg.content))
            elif msg.role == MessageRole.USER:
                lc_messages.append(HumanMessage(content=msg.content))
            elif msg.role == MessageRole.ASSISTANT:
                lc_messages.append(AIMessage(content=msg.content))
        return lc_messages
    
    def _add_json_instructions(
        self, 
        messages: List, 
        json_schema: Optional[Dict[str, Any]] = None
    ) -> List:
        """Add JSON formatting instructions to messages."""
        enhanced_messages = messages.copy()
        
        # Add system message with JSON instructions
        json_instruction = "Return only valid JSON. No prose before or after."
        if json_schema:
            json_instruction += f" Match this schema: {json.dumps(json_schema)}"
        
        # Insert at beginning or enhance existing system message
        if enhanced_messages and isinstance(enhanced_messages[0], SystemMessage):
            enhanced_messages[0].content += f"\n\n{json_instruction}"
        else:
            enhanced_messages.insert(0, SystemMessage(content=json_instruction))
        
        return enhanced_messages
    
    async def _invoke_with_tool_use(
        self, 
        model, 
        messages: List, 
        json_schema: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Attempt to use tool-use pattern for structured output."""
        # This is a simplified tool-use implementation
        # In practice, you'd define a proper tool based on the schema
        try:
            # Create a tool definition from the schema
            tool_def = {
                "name": "extract_structured_data",
                "description": "Extract structured data according to the provided schema",
                "input_schema": json_schema
            }
            
            # For now, fall back to regular prompting
            # Full tool-use implementation would require more complex setup
            return None
            
        except Exception as e:
            self.logger.warning(f"Tool-use pattern failed: {e}")
            return None
    
    def _extract_usage_from_response(self, response) -> Optional[UsageInfo]:
        """Extract usage information from response."""
        # TODO: Implement proper usage extraction from LangChain response
        return None
    
    async def _get_default_test_model(self) -> str:
        """Get default model for testing."""
        return "claude-3-sonnet-20240229"