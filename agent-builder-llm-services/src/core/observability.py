"""Observability setup - logging, metrics, and tracing."""

import logging
import sys
import time
from contextlib import contextmanager
from typing import Any, Dict, Optional

import structlog
from prometheus_client import Counter, Histogram, start_http_server
from structlog.processors import JSONRenderer


# Metrics
llm_invoke_total = Counter(
    "llm_invoke_total",
    "Total number of LLM invocations",
    ["provider", "model", "status"]
)

llm_invoke_duration = Histogram(
    "llm_invoke_duration_seconds",
    "LLM invocation duration in seconds",
    ["provider", "model"]
)

llm_tokens_total = Counter(
    "llm_tokens_total",
    "Total number of tokens processed",
    ["provider", "model", "type"]  # type: input, output
)

llm_errors_total = Counter(
    "llm_errors_total",
    "Total number of LLM errors",
    ["provider", "error_type"]
)


def configure_logging(log_level: str = "INFO", service_name: str = "agent-builder-llm-services") -> None:
    """Configure structured logging with structlog."""
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper()),
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.CallsiteParameterAdder(
                parameters=[structlog.processors.CallsiteParameter.FUNC_NAME]
            ),
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper())
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


def start_metrics_server(port: int = 9090) -> None:
    """Start Prometheus metrics server."""
    try:
        start_http_server(port)
        logger = get_logger(__name__)
        logger.info("Metrics server started", port=port)
    except Exception as e:
        logger = get_logger(__name__)
        logger.error("Failed to start metrics server", error=str(e), port=port)


@contextmanager
def track_llm_invoke(provider: str, model: str):
    """Context manager to track LLM invocation metrics."""
    start_time = time.time()
    status = "success"
    
    try:
        yield
    except Exception:
        status = "error"
        raise
    finally:
        duration = time.time() - start_time
        
        # Record metrics
        llm_invoke_total.labels(provider=provider, model=model, status=status).inc()
        llm_invoke_duration.labels(provider=provider, model=model).observe(duration)


def track_tokens(provider: str, model: str, input_tokens: int, output_tokens: int) -> None:
    """Track token usage metrics."""
    llm_tokens_total.labels(provider=provider, model=model, type="input").inc(input_tokens)
    llm_tokens_total.labels(provider=provider, model=model, type="output").inc(output_tokens)


def track_error(provider: str, error_type: str) -> None:
    """Track error metrics."""
    llm_errors_total.labels(provider=provider, error_type=error_type).inc()


class RequestContextMiddleware:
    """Middleware to add request context to logs."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """ASGI middleware to add request context."""
        if scope["type"] == "http":
            # Extract request ID from headers
            headers = dict(scope.get("headers", []))
            request_id = headers.get(b"x-request-id", b"").decode("utf-8")
            
            if not request_id:
                import uuid
                request_id = str(uuid.uuid4())
            
            # Add to structlog context
            structlog.contextvars.clear_contextvars()
            structlog.contextvars.bind_contextvars(
                request_id=request_id,
                method=scope.get("method"),
                path=scope.get("path"),
            )
        
        await self.app(scope, receive, send)


def log_request_response(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    request_data: Optional[Dict[str, Any]] = None,
    response_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Log request and response with structured data."""
    logger = get_logger(__name__)
    
    # Sanitize sensitive data
    from .security import sanitize_request_data
    
    safe_request_data = sanitize_request_data(request_data) if request_data else None
    safe_response_data = sanitize_request_data(response_data) if response_data else None
    
    logger.info(
        "HTTP request completed",
        method=method,
        path=path,
        status_code=status_code,
        duration_ms=duration_ms,
        request_data=safe_request_data,
        response_data=safe_response_data,
    )


def log_llm_invocation(
    provider: str,
    model: str,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    duration_ms: Optional[float] = None,
    status: str = "success",
    error: Optional[str] = None,
) -> None:
    """Log LLM invocation details."""
    logger = get_logger(__name__)
    
    log_data = {
        "event": "llm_invocation",
        "provider": provider,
        "model": model,
        "status": status,
    }
    
    if input_tokens is not None:
        log_data["input_tokens"] = input_tokens
    if output_tokens is not None:
        log_data["output_tokens"] = output_tokens
    if duration_ms is not None:
        log_data["duration_ms"] = duration_ms
    if error:
        log_data["error"] = error
    
    if status == "success":
        logger.info("LLM invocation completed", **log_data)
    else:
        logger.error("LLM invocation failed", **log_data)