"""OpenAI provider adapter using LangChain."""

import json
from typing import Any, AsyncIterator, Dict, List, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from openai import AsyncOpenAI

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


class OpenAIClient(BaseLlmClient):
    """OpenAI provider client using LangChain."""
    
    def __init__(self, credentials: Credentials):
        """Initialize OpenAI client.
        
        Args:
            credentials: OpenAI credentials
        """
        super().__init__(credentials)
        
        if not credentials.api_key:
            raise UnauthorizedError("OpenAI API key is required")
        
        # Initialize LangChain OpenAI client
        self.chat_model = ChatOpenAI(
            api_key=credentials.api_key,
            temperature=0.2,
            timeout=120,
        )
        
        # Initialize direct OpenAI client for additional operations
        self.openai_client = AsyncOpenAI(api_key=credentials.api_key)
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "openai"
    
    async def _invoke_implementation(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> LLMInvokeResponse:
        """OpenAI-specific invoke implementation."""
        try:
            # Convert messages to LangChain format
            lc_messages = self._convert_messages(messages)
            
            # Configure model
            model_config = {
                "model": model,
                "temperature": temperature or 0.2,
                "max_tokens": max_tokens or 4000,
            }
            
            # Enable JSON mode if schema provided or extra params request it
            if json_schema or extra_params.get("response_format") == "json":
                model_config["response_format"] = {"type": "json_object"}
            
            # Apply extra parameters
            if extra_params:
                model_config.update(extra_params)
            
            # Create configured model
            configured_model = self.chat_model.bind(**model_config)
            
            # Use structured output if schema provided and model supports it
            if json_schema and model in ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]:
                from pydantic import BaseModel, create_model
                
                # Create dynamic Pydantic model from JSON schema
                try:
                    dynamic_model = self._create_pydantic_model_from_schema(json_schema)
                    chain = configured_model.with_structured_output(dynamic_model)
                    result = await chain.ainvoke(lc_messages)
                    
                    # Convert Pydantic model to dict
                    json_result = result.dict() if hasattr(result, 'dict') else result
                    
                    return LLMInvokeResponse(
                        ok=True,
                        provider=self.provider_name,
                        model=model,
                        json=json_result,
                        validation={"valid": True},
                        usage=self._extract_usage_from_response(None),  # TODO: Get usage
                        meta={"finish_reason": "stop"}
                    )
                except Exception as e:
                    self.logger.warning(
                        "Structured output failed, falling back to JSON parser",
                        error=str(e)
                    )
            
            # Fallback to JSON parser
            parser = JsonOutputParser()
            chain = configured_model | parser
            
            result = await chain.ainvoke(lc_messages)
            
            return LLMInvokeResponse(
                ok=True,
                provider=self.provider_name,
                model=model,
                json=result,
                validation={"valid": True},
                usage=self._extract_usage_from_response(None),  # TODO: Get usage
                meta={"finish_reason": "stop"}
            )
            
        except Exception as e:
            self.logger.error(f"OpenAI invocation failed: {e}")
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
        """OpenAI-specific streaming implementation."""
        try:
            # Use direct OpenAI client for streaming
            openai_messages = [
                {"role": msg.role.value, "content": msg.content}
                for msg in messages
            ]
            
            kwargs = {
                "model": model,
                "messages": openai_messages,
                "temperature": temperature or 0.2,
                "max_tokens": max_tokens or 4000,
                "stream": True,
            }
            
            # Enable JSON mode if requested
            if json_schema or extra_params.get("response_format") == "json":
                kwargs["response_format"] = {"type": "json_object"}
            
            if extra_params:
                kwargs.update({k: v for k, v in extra_params.items() if k != "response_format"})
            
            accumulated_content = ""
            
            async for chunk in await self.openai_client.chat.completions.create(**kwargs):
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    accumulated_content += content
                    
                    # Emit token event
                    yield StreamEvent(event="token", data=content)
                    
                    # Try to emit partial JSON if we have enough content
                    if len(accumulated_content) > 10:
                        try:
                            # Check if content looks like partial JSON
                            if accumulated_content.strip().startswith('{'):
                                yield StreamEvent(event="partial_json", data=accumulated_content)
                        except Exception:
                            pass
                
                # Handle completion
                if chunk.choices and chunk.choices[0].finish_reason:
                    finish_reason = chunk.choices[0].finish_reason
                    
                    # Emit final JSON
                    if accumulated_content:
                        try:
                            final_json = json.loads(accumulated_content)
                            yield StreamEvent(event="final_json", data=final_json)
                        except json.JSONDecodeError:
                            yield StreamEvent(event="final_json", data={"error": "Invalid JSON", "content": accumulated_content})
                    
                    # Emit usage info
                    if hasattr(chunk, 'usage') and chunk.usage:
                        usage_data = {
                            "inputTokens": chunk.usage.prompt_tokens,
                            "outputTokens": chunk.usage.completion_tokens,
                            "totalTokens": chunk.usage.total_tokens,
                        }
                        yield StreamEvent(event="usage", data=usage_data)
                    
                    yield StreamEvent(event="done", data={"finish_reason": finish_reason})
                    break
                    
        except Exception as e:
            self.logger.error(f"OpenAI streaming failed: {e}")
            yield StreamEvent(
                event="error",
                data={"error": str(e), "provider": self.provider_name}
            )
    
    async def test_connection(self) -> bool:
        """Test OpenAI connection."""
        try:
            await self.openai_client.models.list()
            return True
        except Exception as e:
            self.logger.warning(f"OpenAI connection test failed: {e}")
            return False
    
    async def list_models(self) -> List[str]:
        """List available OpenAI models."""
        try:
            models_response = await self.openai_client.models.list()
            # Filter to chat models
            chat_models = [
                model.id for model in models_response.data
                if any(prefix in model.id for prefix in ["gpt-3.5", "gpt-4"])
            ]
            return sorted(chat_models)
        except Exception as e:
            self.logger.error(f"Failed to list OpenAI models: {e}")
            return ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"]
    
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
    
    def _create_pydantic_model_from_schema(self, schema: Dict[str, Any]):
        """Create a Pydantic model from JSON schema."""
        from pydantic import BaseModel, create_model
        
        # Simple schema to Pydantic conversion
        # This is a basic implementation - could be enhanced
        fields = {}
        properties = schema.get("properties", {})
        
        for field_name, field_def in properties.items():
            field_type = field_def.get("type", "string")
            
            if field_type == "string":
                fields[field_name] = (str, ...)
            elif field_type == "integer":
                fields[field_name] = (int, ...)
            elif field_type == "number":
                fields[field_name] = (float, ...)
            elif field_type == "boolean":
                fields[field_name] = (bool, ...)
            elif field_type == "array":
                fields[field_name] = (List[str], ...)  # Simplified
            else:
                fields[field_name] = (Any, ...)
        
        return create_model("DynamicModel", **fields)
    
    def _extract_usage_from_response(self, response) -> Optional[UsageInfo]:
        """Extract usage information from response."""
        # TODO: Implement proper usage extraction from LangChain response
        return None
    
    async def _get_default_test_model(self) -> str:
        """Get default model for testing."""
        return "gpt-3.5-turbo"