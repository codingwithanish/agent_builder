"""AWS Bedrock provider adapter using LangChain."""

import json
from typing import Any, AsyncIterator, Dict, List, Optional

import boto3
from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser

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
from ..utils.headers import parse_aws_credentials_from_key


class BedrockClient(BaseLlmClient):
    """AWS Bedrock provider client using LangChain."""
    
    def __init__(self, credentials: Credentials):
        """Initialize Bedrock client.
        
        Args:
            credentials: AWS credentials
        """
        super().__init__(credentials)
        
        # Set up AWS credentials
        aws_config = self._setup_aws_credentials(credentials)
        
        # Initialize LangChain Bedrock client
        self.chat_model = ChatBedrock(
            region_name=aws_config["region"],
            credentials_profile_name=aws_config.get("profile"),
            streaming=False,
        )
        
        # Initialize boto3 client for additional operations
        session_kwargs = {}
        if "aws_access_key_id" in aws_config:
            session_kwargs.update({
                "aws_access_key_id": aws_config["aws_access_key_id"],
                "aws_secret_access_key": aws_config["aws_secret_access_key"],
            })
            if "aws_session_token" in aws_config:
                session_kwargs["aws_session_token"] = aws_config["aws_session_token"]
        
        self.bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=aws_config["region"],
            **session_kwargs
        )
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "bedrock"
    
    async def _invoke_implementation(
        self,
        messages: List[Message],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> LLMInvokeResponse:
        """Bedrock-specific invoke implementation."""
        try:
            # Convert messages to LangChain format
            lc_messages = self._convert_messages(messages)
            
            # Configure model
            model_config = {
                "model_id": model,
                "model_kwargs": {
                    "temperature": temperature or 0.2,
                    "max_tokens": max_tokens or 4000,
                }
            }
            
            # Apply extra parameters
            if extra_params:
                model_config["model_kwargs"].update(extra_params)
            
            # Create configured model
            configured_model = self.chat_model.bind(**model_config)
            
            # For JSON output, enhance prompting
            if json_schema:
                enhanced_messages = self._add_json_instructions(lc_messages, json_schema)
            else:
                enhanced_messages = lc_messages
            
            # Use tool-use for Anthropic models on Bedrock if schema provided
            if json_schema and "anthropic.claude" in model:
                try:
                    result = await self._invoke_with_anthropic_tools(
                        model, enhanced_messages, json_schema, model_config["model_kwargs"]
                    )
                    if result:
                        return LLMInvokeResponse(
                            ok=True,
                            provider=self.provider_name,
                            model=model,
                            json=result["json"],
                            validation={"valid": True},
                            usage=result.get("usage"),
                            meta={"finish_reason": "stop"}
                        )
                except Exception as e:
                    self.logger.warning(
                        "Anthropic tool-use failed, falling back to JSON parser",
                        error=str(e)
                    )
            
            # Fallback to JSON parser
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
            self.logger.error(f"Bedrock invocation failed: {e}")
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
        """Bedrock-specific streaming implementation."""
        try:
            # Convert messages for Bedrock
            bedrock_messages = self._convert_messages_for_bedrock(messages, json_schema)
            
            # Prepare request body based on model family
            body = self._prepare_bedrock_body(
                model, bedrock_messages, temperature, max_tokens, extra_params
            )
            
            # Stream with Bedrock
            response = self.bedrock_client.invoke_model_with_response_stream(
                modelId=model,
                body=json.dumps(body)
            )
            
            accumulated_content = ""
            
            for event in response["body"]:
                if "chunk" in event:
                    chunk_data = json.loads(event["chunk"]["bytes"])
                    
                    # Handle different model response formats
                    content = self._extract_content_from_chunk(model, chunk_data)
                    if content:
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
                    
                    # Check for completion
                    if self._is_completion_chunk(model, chunk_data):
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
                        
                        # Emit usage info if available
                        usage_info = self._extract_usage_from_chunk(model, chunk_data)
                        if usage_info:
                            yield StreamEvent(event="usage", data=usage_info)
                        
                        yield StreamEvent(event="done", data={"finish_reason": "stop"})
                        break
                        
        except Exception as e:
            self.logger.error(f"Bedrock streaming failed: {e}")
            yield StreamEvent(
                event="error",
                data={"error": str(e), "provider": self.provider_name}
            )
    
    async def test_connection(self) -> bool:
        """Test Bedrock connection."""
        try:
            # List available models to test connection
            response = self.bedrock_client.list_foundation_models()
            return True
        except Exception as e:
            self.logger.warning(f"Bedrock connection test failed: {e}")
            return False
    
    async def list_models(self) -> List[str]:
        """List available Bedrock models."""
        try:
            response = self.bedrock_client.list_foundation_models()
            models = []
            for model in response.get("modelSummaries", []):
                model_id = model.get("modelId", "")
                # Filter to supported models
                if any(family in model_id for family in [
                    "anthropic.claude", "amazon.titan", "ai21.j2", 
                    "cohere.command", "meta.llama"
                ]):
                    models.append(model_id)
            return sorted(models)
        except Exception as e:
            self.logger.error(f"Failed to list Bedrock models: {e}")
            # Return common models as fallback
            return [
                "anthropic.claude-3-5-sonnet-20241022-v2:0",
                "anthropic.claude-3-sonnet-20240229-v1:0",
                "anthropic.claude-3-opus-20240229-v1:0",
                "anthropic.claude-3-haiku-20240307-v1:0",
            ]
    
    def _setup_aws_credentials(self, credentials: Credentials) -> Dict[str, str]:
        """Set up AWS credentials configuration."""
        config = {"region": credentials.region or "us-east-1"}
        
        if credentials.api_key:
            try:
                aws_creds = parse_aws_credentials_from_key(credentials.api_key)
                config.update(aws_creds)
            except Exception as e:
                raise ConfigurationError(f"Invalid AWS credentials format: {e}")
        
        return config
    
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
    
    def _convert_messages_for_bedrock(
        self, 
        messages: List[Message], 
        json_schema: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Convert messages for direct Bedrock API calls."""
        bedrock_messages = []
        
        for msg in messages:
            bedrock_messages.append({
                "role": msg.role.value,
                "content": msg.content
            })
        
        # Add JSON instructions if schema provided
        if json_schema and bedrock_messages:
            json_instruction = f"\n\nRespond with valid JSON matching this schema: {json.dumps(json_schema)}"
            bedrock_messages[-1]["content"] += json_instruction
        
        return bedrock_messages
    
    def _add_json_instructions(
        self, 
        messages: List, 
        json_schema: Optional[Dict[str, Any]] = None
    ) -> List:
        """Add JSON formatting instructions to messages."""
        enhanced_messages = messages.copy()
        
        json_instruction = "Return only valid JSON. No prose before or after."
        if json_schema:
            json_instruction += f" Match this schema: {json.dumps(json_schema)}"
        
        if enhanced_messages and isinstance(enhanced_messages[0], SystemMessage):
            enhanced_messages[0].content += f"\n\n{json_instruction}"
        else:
            enhanced_messages.insert(0, SystemMessage(content=json_instruction))
        
        return enhanced_messages
    
    def _prepare_bedrock_body(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: Optional[float],
        max_tokens: Optional[int],
        extra_params: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare request body for Bedrock API based on model family."""
        if "anthropic.claude" in model:
            # Anthropic Claude format
            system_message = None
            conversation_messages = []
            
            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    conversation_messages.append(msg)
            
            body = {
                "messages": conversation_messages,
                "max_tokens": max_tokens or 4000,
                "temperature": temperature or 0.2,
                "anthropic_version": "bedrock-2023-05-31",
            }
            
            if system_message:
                body["system"] = system_message
            
        elif "amazon.titan" in model:
            # Amazon Titan format
            prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
            body = {
                "inputText": prompt,
                "textGenerationConfig": {
                    "maxTokenCount": max_tokens or 4000,
                    "temperature": temperature or 0.2,
                }
            }
        
        else:
            # Generic format
            prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
            body = {
                "prompt": prompt,
                "max_tokens": max_tokens or 4000,
                "temperature": temperature or 0.2,
            }
        
        # Apply extra parameters
        if extra_params:
            body.update(extra_params)
        
        return body
    
    def _extract_content_from_chunk(self, model: str, chunk_data: Dict[str, Any]) -> Optional[str]:
        """Extract content from streaming chunk based on model family."""
        if "anthropic.claude" in model:
            if "delta" in chunk_data and "text" in chunk_data["delta"]:
                return chunk_data["delta"]["text"]
        elif "amazon.titan" in model:
            if "outputText" in chunk_data:
                return chunk_data["outputText"]
        else:
            # Generic extraction
            for field in ["text", "content", "completion"]:
                if field in chunk_data:
                    return chunk_data[field]
        
        return None
    
    def _is_completion_chunk(self, model: str, chunk_data: Dict[str, Any]) -> bool:
        """Check if chunk indicates completion."""
        if "anthropic.claude" in model:
            return chunk_data.get("type") == "message_stop"
        elif "amazon.titan" in model:
            return chunk_data.get("completionReason") is not None
        else:
            return chunk_data.get("stop_reason") is not None or chunk_data.get("finished") is True
    
    def _extract_usage_from_chunk(self, model: str, chunk_data: Dict[str, Any]) -> Optional[Dict[str, int]]:
        """Extract usage information from completion chunk."""
        if "anthropic.claude" in model and "usage" in chunk_data:
            usage = chunk_data["usage"]
            return {
                "inputTokens": usage.get("input_tokens", 0),
                "outputTokens": usage.get("output_tokens", 0),
            }
        return None
    
    async def _invoke_with_anthropic_tools(
        self,
        model: str,
        messages: List,
        json_schema: Dict[str, Any],
        model_kwargs: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Use Anthropic tool-use pattern for structured output on Bedrock."""
        # Simplified tool-use implementation
        # Full implementation would require more complex tool definitions
        return None
    
    def _extract_usage_from_response(self, response) -> Optional[UsageInfo]:
        """Extract usage information from response."""
        # TODO: Implement proper usage extraction
        return None
    
    async def _get_default_test_model(self) -> str:
        """Get default model for testing."""
        return "anthropic.claude-3-sonnet-20240229-v1:0"