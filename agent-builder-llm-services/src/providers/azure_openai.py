"""Azure OpenAI provider adapter using LangChain."""

import json
from typing import Any, AsyncIterator, Dict, List, Optional

from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from openai import AsyncAzureOpenAI

from .base import BaseLlmClient
from ..domain.schemas import (
    Credentials,
    LLMInvokeResponse,
    Message,
    MessageRole,
    StreamEvent,
    UsageInfo,
)
from ..domain.errors import ProviderError, UnauthorizedError, ConfigurationError


class AzureOpenAIClient(BaseLlmClient):
    """Azure OpenAI provider client using LangChain."""
    
    def __init__(self, credentials: Credentials):
        """Initialize Azure OpenAI client.
        
        Args:
            credentials: Azure OpenAI credentials
        """
        super().__init__(credentials)
        
        if not all([credentials.api_key, credentials.endpoint, credentials.deployment]):
            raise UnauthorizedError(
                "Azure OpenAI requires api_key, endpoint, and deployment"
            )
        
        # Initialize LangChain Azure OpenAI client
        self.chat_model = AzureChatOpenAI(
            api_key=credentials.api_key,
            azure_endpoint=credentials.endpoint,
            azure_deployment=credentials.deployment,
            api_version="2024-02-01",
            temperature=0.2,
            timeout=120,
        )
        
        # Initialize direct Azure OpenAI client for additional operations
        self.azure_client = AsyncAzureOpenAI(
            api_key=credentials.api_key,
            azure_endpoint=credentials.endpoint,
            api_version="2024-02-01",
        )
        
        self.deployment = credentials.deployment
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "azure-openai"
    
    async def _invoke_implementation(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> LLMInvokeResponse:
        """Azure OpenAI-specific invoke implementation."""
        try:
            # Convert messages to LangChain format
            lc_messages = self._convert_messages(messages)
            
            # Configure model - use deployment name instead of model
            model_config = {
                "temperature": temperature or 0.2,
                "max_tokens": max_tokens or 4000,
            }
            
            # Enable JSON mode if schema provided or extra params request it
            if json_schema or extra_params.get("response_format") == "json":
                model_config["response_format"] = {"type": "json_object"}
            
            # Apply extra parameters
            if extra_params:
                model_config.update({k: v for k, v in extra_params.items() if k != "response_format"})
            
            # Create configured model
            configured_model = self.chat_model.bind(**model_config)
            
            # Use structured output if schema provided and deployment supports it
            if json_schema and any(name in self.deployment.lower() for name in ["gpt-4", "gpt-35-turbo"]):
                from pydantic import BaseModel, create_model
                
                try:
                    dynamic_model = self._create_pydantic_model_from_schema(json_schema)
                    chain = configured_model.with_structured_output(dynamic_model)
                    result = await chain.ainvoke(lc_messages)
                    
                    # Convert Pydantic model to dict
                    json_result = result.dict() if hasattr(result, 'dict') else result
                    
                    return LLMInvokeResponse(
                        ok=True,
                        provider=self.provider_name,
                        model=self.deployment,
                        json=json_result,
                        validation={"valid": True},
                        usage=self._extract_usage_from_response(None),
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
                model=self.deployment,
                json=result,
                validation={"valid": True},
                usage=self._extract_usage_from_response(None),
                meta={"finish_reason": "stop"}
            )
            
        except Exception as e:
            self.logger.error(f"Azure OpenAI invocation failed: {e}")
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
        """Azure OpenAI-specific streaming implementation."""
        try:
            # Use direct Azure OpenAI client for streaming
            azure_messages = [
                {"role": msg.role.value, "content": msg.content}
                for msg in messages
            ]
            
            kwargs = {
                "model": self.deployment,  # Use deployment name
                "messages": azure_messages,
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
            
            async for chunk in await self.azure_client.chat.completions.create(**kwargs):
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    accumulated_content += content
                    
                    # Emit token event
                    yield StreamEvent(event="token", data=content)
                    
                    # Try to emit partial JSON if we have enough content
                    if len(accumulated_content) > 10:
                        try:
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
                            yield StreamEvent(
                                event="final_json", 
                                data={"error": "Invalid JSON", "content": accumulated_content}
                            )
                    
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
            self.logger.error(f"Azure OpenAI streaming failed: {e}")
            yield StreamEvent(
                event="error",
                data={"error": str(e), "provider": self.provider_name}
            )
    
    async def test_connection(self) -> bool:
        """Test Azure OpenAI connection."""
        try:
            # Test with a simple completion
            response = await self.azure_client.chat.completions.create(
                model=self.deployment,
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=1
            )
            return True
        except Exception as e:
            self.logger.warning(f"Azure OpenAI connection test failed: {e}")
            return False
    
    async def list_models(self) -> List[str]:
        """List available Azure OpenAI models."""
        try:
            models_response = await self.azure_client.models.list()
            models = [model.id for model in models_response.data]
            return sorted(models)
        except Exception as e:
            self.logger.error(f"Failed to list Azure OpenAI models: {e}")
            # Return common Azure deployments as fallback
            return [
                "gpt-4",
                "gpt-4-turbo",
                "gpt-35-turbo",
                "gpt-35-turbo-16k",
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
    
    def _create_pydantic_model_from_schema(self, schema: Dict[str, Any]):
        """Create a Pydantic model from JSON schema."""
        from pydantic import BaseModel, create_model
        
        # Simple schema to Pydantic conversion
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
        return self.deployment