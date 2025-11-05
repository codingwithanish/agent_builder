"""FastAPI routes for LLM services."""

import json
from datetime import datetime
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from ..core.config import AppMode, LLMProvider, settings
from ..domain.schemas import (
    HealthResponse,
    LLMInvokeRequest,
    LLMInvokeResponse,
    TestConnectionRequest,
    TestConnectionResponse,
    ValidateJSONRequest,
    ValidateJSONResponse,
    ListModelsResponse,
)
from ..domain.errors import LLMServiceError
from ..services.invoke import InvokeService
from ..services.stream import StreamService
from ..services.json_enforcer import DefaultJSONEnforcer
from ..services.credential_resolver import DefaultCredentialResolver
from .deps import (
    get_invoke_service,
    get_stream_service,
    get_json_enforcer,
    get_credential_resolver,
    get_app_mode,
    get_request_headers,
    get_request_id,
)


# Create router
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat(),
        app_mode=settings.app_mode.value,
    )


@router.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi import Response
    
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@router.post("/v1/llm/invoke-json", response_model=LLMInvokeResponse)
async def invoke_llm_json(
    request: LLMInvokeRequest,
    headers: Dict[str, str] = Depends(get_request_headers),
    request_id: str = Depends(get_request_id),
    invoke_service: InvokeService = Depends(get_invoke_service),
    app_mode: AppMode = Depends(get_app_mode),
) -> LLMInvokeResponse:
    """Invoke LLM and return JSON response.
    
    Args:
        request: LLM invocation request
        headers: Request headers
        request_id: Request ID for tracking
        invoke_service: LLM invoke service
        app_mode: Application mode
        
    Returns:
        LLM response with JSON content
    """
    try:
        # Handle dummy mode
        if app_mode == AppMode.DUMMY:
            return await _handle_dummy_invoke(request)
        
        # Normal invocation
        response = await invoke_service.invoke(request, headers)
        return response
        
    except LLMServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={
                "error": e.message,
                "error_code": e.error_code,
                "details": e.details,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "error_code": "internal_error",
                "details": {"message": str(e)},
            }
        )


@router.post("/v1/llm/invoke-stream")
async def invoke_llm_stream(
    request: LLMInvokeRequest,
    fastapi_request: Request,
    headers: Dict[str, str] = Depends(get_request_headers),
    request_id: str = Depends(get_request_id),
    stream_service: StreamService = Depends(get_stream_service),
    app_mode: AppMode = Depends(get_app_mode),
) -> EventSourceResponse:
    """Stream LLM response as SSE events.
    
    Args:
        request: LLM invocation request
        fastapi_request: FastAPI request object
        headers: Request headers
        request_id: Request ID for tracking
        stream_service: LLM stream service
        app_mode: Application mode
        
    Returns:
        SSE response with streaming events
    """
    try:
        # Handle dummy mode
        if app_mode == AppMode.DUMMY:
            return EventSourceResponse(_dummy_stream_generator(request))
        
        # Normal streaming
        async def event_generator():
            try:
                async for sse_event in stream_service.create_sse_event_generator(request, headers):
                    yield sse_event
            except LLMServiceError as e:
                # Emit error event
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "error": e.message,
                        "error_code": e.error_code,
                        "details": e.details,
                    })
                }
            except Exception as e:
                # Emit error event
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "error": "Internal server error",
                        "error_code": "internal_error",
                        "details": {"message": str(e)},
                    })
                }
        
        return EventSourceResponse(event_generator())
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to start streaming",
                "error_code": "streaming_error",
                "details": {"message": str(e)},
            }
        )


@router.post("/v1/llm/test", response_model=TestConnectionResponse)
async def test_connection(
    request: TestConnectionRequest,
    headers: Dict[str, str] = Depends(get_request_headers),
    credential_resolver: DefaultCredentialResolver = Depends(get_credential_resolver),
) -> TestConnectionResponse:
    """Test connection to LLM provider.
    
    Args:
        request: Connection test request
        headers: Request headers
        credential_resolver: Credential resolver service
        
    Returns:
        Connection test result
    """
    try:
        # Resolve credentials
        credentials = await credential_resolver.resolve_credentials(
            provider=request.provider.value,
            headers=headers,
        )
        
        # Create client and test connection
        from ..services.invoke import InvokeService
        invoke_service = InvokeService()
        client = invoke_service._create_client(request.provider, credentials)
        
        connection_ok = await client.test_connection()
        
        return TestConnectionResponse(
            ok=connection_ok,
            provider=request.provider.value,
            message="Connection successful" if connection_ok else "Connection failed",
        )
        
    except LLMServiceError as e:
        return TestConnectionResponse(
            ok=False,
            provider=request.provider.value,
            message=e.message,
            details=e.details,
        )
    except Exception as e:
        return TestConnectionResponse(
            ok=False,
            provider=request.provider.value,
            message=f"Connection test failed: {str(e)}",
        )


@router.get("/v1/llm/models", response_model=ListModelsResponse)
async def list_models(
    provider: LLMProvider,
    region: str = None,
    headers: Dict[str, str] = Depends(get_request_headers),
    credential_resolver: DefaultCredentialResolver = Depends(get_credential_resolver),
) -> ListModelsResponse:
    """List available models for a provider.
    
    Args:
        provider: LLM provider
        region: AWS region (for Bedrock)
        headers: Request headers
        credential_resolver: Credential resolver service
        
    Returns:
        List of available models
    """
    try:
        # Resolve credentials
        credentials = await credential_resolver.resolve_credentials(
            provider=provider.value,
            headers=headers,
        )
        
        if region and provider == LLMProvider.BEDROCK:
            credentials.region = region
        
        # Create client and list models
        from ..services.invoke import InvokeService
        invoke_service = InvokeService()
        client = invoke_service._create_client(provider, credentials)
        
        models = await client.list_models()
        
        return ListModelsResponse(
            provider=provider.value,
            models=models,
            region=region,
        )
        
    except LLMServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={
                "error": e.message,
                "error_code": e.error_code,
                "details": e.details,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to list models",
                "error_code": "list_models_error",
                "details": {"message": str(e)},
            }
        )


@router.post("/v1/llm/validate-json", response_model=ValidateJSONResponse)
async def validate_json(
    request: ValidateJSONRequest,
    json_enforcer: DefaultJSONEnforcer = Depends(get_json_enforcer),
) -> ValidateJSONResponse:
    """Validate and optionally repair JSON.
    
    Args:
        request: JSON validation request
        json_enforcer: JSON enforcement service
        
    Returns:
        Validation result with optional repaired JSON
    """
    try:
        result = await json_enforcer.parse_and_validate(
            content=request.text,
            json_schema=request.json_schema,
            strict=False,  # Don't raise errors for validation endpoint
        )
        
        return ValidateJSONResponse(
            ok=result["json"] is not None,
            json=result["json"],
            validation=result["validation"],
            repaired=result.get("repaired", False),
            error=None if result["json"] is not None else "Failed to parse JSON",
        )
        
    except Exception as e:
        return ValidateJSONResponse(
            ok=False,
            error=f"JSON validation failed: {str(e)}",
        )


# Dummy mode helpers

async def _handle_dummy_invoke(request: LLMInvokeRequest) -> LLMInvokeResponse:
    """Handle dummy mode invocation."""
    import asyncio
    
    # Simulate processing delay
    await asyncio.sleep(0.5)
    
    # Generate dummy JSON based on schema
    dummy_json = _generate_dummy_json(request.json_schema)
    
    return LLMInvokeResponse(
        ok=True,
        provider=request.provider.value,
        model=request.model,
        json=dummy_json,
        validation={"valid": True},
        usage={
            "input_tokens": 50,
            "output_tokens": 25,
            "total_tokens": 75,
        },
        meta={
            "finish_reason": "stop",
            "dummy_mode": True,
        }
    )


async def _dummy_stream_generator(request: LLMInvokeRequest):
    """Generate dummy streaming events."""
    import asyncio
    
    # Generate dummy JSON
    dummy_json = _generate_dummy_json(request.json_schema)
    dummy_text = json.dumps(dummy_json)
    
    # Stream tokens
    for i, char in enumerate(dummy_text):
        yield {
            "event": "token",
            "data": char,
        }
        await asyncio.sleep(0.05)  # Simulate streaming delay
        
        # Emit partial JSON periodically
        if i > 0 and i % 10 == 0:
            yield {
                "event": "partial_json",
                "data": dummy_text[:i+1],
            }
    
    # Emit final JSON
    yield {
        "event": "final_json",
        "data": json.dumps(dummy_json),
    }
    
    # Emit usage
    yield {
        "event": "usage",
        "data": json.dumps({
            "inputTokens": 50,
            "outputTokens": 25,
            "totalTokens": 75,
        })
    }
    
    # Emit done
    yield {
        "event": "done",
        "data": json.dumps({
            "finish_reason": "stop",
            "dummy_mode": True,
        })
    }


def _generate_dummy_json(schema: dict = None) -> dict:
    """Generate dummy JSON data."""
    if schema and "properties" in schema:
        # Generate based on schema
        dummy = {}
        for field, field_def in schema["properties"].items():
            field_type = field_def.get("type", "string")
            
            if field_type == "string":
                dummy[field] = f"dummy_{field}"
            elif field_type == "integer":
                dummy[field] = 42
            elif field_type == "number":
                dummy[field] = 3.14
            elif field_type == "boolean":
                dummy[field] = True
            elif field_type == "array":
                dummy[field] = ["item1", "item2"]
            elif field_type == "object":
                dummy[field] = {"nested": "value"}
            else:
                dummy[field] = f"dummy_{field}"
        
        return dummy
    
    # Default dummy JSON
    return {
        "title": "Dummy Response",
        "message": "This is a dummy response in dummy mode",
        "timestamp": datetime.utcnow().isoformat(),
        "data": ["item1", "item2", "item3"],
        "success": True,
    }


# AI Chat endpoint for workflow generation

from pydantic import BaseModel

class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class GeneratedFlow(BaseModel):
    nodes: List[Dict]
    edges: List[Dict]
    description: str = None

class ChatResponse(BaseModel):
    response: ChatMessage
    generatedFlow: GeneratedFlow = None


@router.post("/api/chat/generate-flow", response_model=ChatResponse)
async def generate_flow_from_chat(
    request: ChatRequest,
    app_mode: AppMode = Depends(get_app_mode),
) -> ChatResponse:
    """Generate workflow from chat message.

    Args:
        request: Chat request with message and history
        app_mode: Application mode

    Returns:
        Chat response with optional generated flow
    """
    import asyncio
    from datetime import datetime

    # Check if we should use real NVIDIA NIMs or dummy mode
    if app_mode == AppMode.REAL and settings.has_provider_credentials(LLMProvider.NVIDIA):
        try:
            # Import service manager
            from ..services.service_manager import service_manager

            # Get workflow generator (handles initialization and caching)
            workflow_generator = await service_manager.get_workflow_generator()

            # Convert chat history to proper format
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.history
            ]

            # Generate workflow using NVIDIA NIMs
            result = await workflow_generator.generate_workflow(
                user_message=request.message,
                conversation_history=conversation_history
            )

            # Create response
            assistant_message = ChatMessage(
                id=f"msg-{int(datetime.utcnow().timestamp() * 1000)}",
                role="assistant",
                content=result['response_text'],
                timestamp=datetime.utcnow().isoformat()
            )

            generated_flow = None
            if result.get('generated_flow'):
                generated_flow = GeneratedFlow(**result['generated_flow'])

            return ChatResponse(
                response=assistant_message,
                generatedFlow=generated_flow
            )

        except Exception as e:
            # Log error and fall back to dummy mode
            import structlog
            logger = structlog.get_logger()
            logger.error("Error using NVIDIA NIMs, falling back to dummy mode", error=str(e))
            # Fall through to dummy mode below

    # Dummy mode or fallback
    await asyncio.sleep(1.0)

    message_lower = request.message.lower()
    response_text = ""
    generated_flow = None

    # Pattern matching for different workflow types
    if "code review" in message_lower or "code reviewer" in message_lower:
        response_text = "Great! I'll create a code review workflow for you. This flow includes a Code Reviewer agent with the Git Tool connected, followed by a Text Summarizer to summarize the review results."

        timestamp = int(datetime.utcnow().timestamp() * 1000)
        generated_flow = GeneratedFlow(
            nodes=[
                {
                    "id": f"agent-{timestamp}-1",
                    "kind": "agent",
                    "position": {"x": 300, "y": 200},
                    "data": {
                        "agentId": "ca5",
                        "name": "Code Reviewer",
                        "description": "Reviews code for best practices",
                        "env": {}
                    },
                    "status": "draft"
                },
                {
                    "id": f"tool-{timestamp}-1",
                    "kind": "tool",
                    "position": {"x": 300, "y": 380},
                    "data": {
                        "toolId": "ct9",
                        "name": "Git Tool",
                        "description": "Git operations for version control",
                        "env": {}
                    },
                    "status": "draft"
                },
                {
                    "id": f"agent-{timestamp}-2",
                    "kind": "agent",
                    "position": {"x": 550, "y": 200},
                    "data": {
                        "agentId": "ca1",
                        "name": "Text Summarizer",
                        "description": "Summarizes the review",
                        "env": {}
                    },
                    "status": "draft"
                }
            ],
            edges=[
                {
                    "id": f"edge-{timestamp}-1",
                    "source": "__INPUT__",
                    "target": f"agent-{timestamp}-1"
                },
                {
                    "id": f"edge-{timestamp}-2",
                    "source": f"agent-{timestamp}-1",
                    "target": f"agent-{timestamp}-2"
                },
                {
                    "id": f"edge-{timestamp}-3",
                    "source": f"agent-{timestamp}-2",
                    "target": "__OUTPUT__"
                },
                {
                    "id": f"edge-{timestamp}-tool-1",
                    "source": f"agent-{timestamp}-1",
                    "sourceHandle": "tool-bottom",
                    "target": f"tool-{timestamp}-1",
                    "targetHandle": None
                }
            ],
            description="Code Review Workflow"
        )
    elif "data" in message_lower and ("analyze" in message_lower or "analysis" in message_lower):
        response_text = "I'll set up a data analysis workflow. This includes a Data Analyzer agent to analyze your data patterns."

        timestamp = int(datetime.utcnow().timestamp() * 1000)
        generated_flow = GeneratedFlow(
            nodes=[
                {
                    "id": f"agent-{timestamp}",
                    "kind": "agent",
                    "position": {"x": 350, "y": 200},
                    "data": {
                        "agentId": "ca2",
                        "name": "Data Analyzer",
                        "description": "Analyzes data patterns",
                        "env": {},
                        "attachedToolIds": []
                    },
                    "status": "draft"
                }
            ],
            edges=[
                {
                    "id": f"edge-{timestamp}-1",
                    "source": "__INPUT__",
                    "target": f"agent-{timestamp}"
                },
                {
                    "id": f"edge-{timestamp}-2",
                    "source": f"agent-{timestamp}",
                    "target": "__OUTPUT__"
                }
            ],
            description="Data Analysis Workflow"
        )
    elif "translate" in message_lower or "translation" in message_lower:
        response_text = "I'll create a translation workflow using the Language Translator agent. This will take input text and translate it to your desired language."

        timestamp = int(datetime.utcnow().timestamp() * 1000)
        generated_flow = GeneratedFlow(
            nodes=[
                {
                    "id": f"agent-{timestamp}",
                    "kind": "agent",
                    "position": {"x": 350, "y": 200},
                    "data": {
                        "agentId": "ca4",
                        "name": "Language Translator",
                        "description": "Translates text",
                        "env": {},
                        "attachedToolIds": []
                    },
                    "status": "draft"
                }
            ],
            edges=[
                {
                    "id": f"edge-{timestamp}-1",
                    "source": "__INPUT__",
                    "target": f"agent-{timestamp}"
                },
                {
                    "id": f"edge-{timestamp}-2",
                    "source": f"agent-{timestamp}",
                    "target": "__OUTPUT__"
                }
            ],
            description="Translation Workflow"
        )
    elif "summarize" in message_lower or "summary" in message_lower:
        response_text = "I'll build a text summarization workflow. This uses the Text Summarizer agent to condense long content into key points."

        timestamp = int(datetime.utcnow().timestamp() * 1000)
        generated_flow = GeneratedFlow(
            nodes=[
                {
                    "id": f"agent-{timestamp}",
                    "kind": "agent",
                    "position": {"x": 350, "y": 200},
                    "data": {
                        "agentId": "ca1",
                        "name": "Text Summarizer",
                        "description": "Summarizes content",
                        "env": {},
                        "attachedToolIds": []
                    },
                    "status": "draft"
                }
            ],
            edges=[
                {
                    "id": f"edge-{timestamp}-1",
                    "source": "__INPUT__",
                    "target": f"agent-{timestamp}"
                },
                {
                    "id": f"edge-{timestamp}-2",
                    "source": f"agent-{timestamp}",
                    "target": "__OUTPUT__"
                }
            ],
            description="Text Summarization Workflow"
        )
    else:
        response_text = 'I understand you want to create an agentic workflow. Could you provide more details about what you\'d like to accomplish? For example:\n\n- "Create a code review workflow"\n- "Set up a data analysis pipeline"\n- "Build a translation workflow"\n- "Create a text summarization flow"\n\nYou can also browse the Catalogue tab to see available agents and tools that can be used in your workflow.'

    assistant_message = ChatMessage(
        id=f"msg-{int(datetime.utcnow().timestamp() * 1000)}",
        role="assistant",
        content=response_text,
        timestamp=datetime.utcnow().isoformat()
    )

    return ChatResponse(
        response=assistant_message,
        generatedFlow=generated_flow
    )