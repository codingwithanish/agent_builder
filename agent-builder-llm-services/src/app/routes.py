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