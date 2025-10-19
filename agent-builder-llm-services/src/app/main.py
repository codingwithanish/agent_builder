"""FastAPI application main module."""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from ..core.config import settings
from ..core.observability import (
    configure_logging,
    get_logger,
    start_metrics_server,
    log_request_response,
)
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger = get_logger(__name__)
    logger.info("Starting agent-builder-llm-services", version="1.0.0", mode=settings.app_mode.value)
    
    # Configure logging
    configure_logging(settings.log_level, settings.service_name)
    
    # Start metrics server if enabled
    if settings.enable_metrics:
        start_metrics_server(settings.metrics_port)
    
    logger.info("Service startup completed", port=settings.port)
    
    yield
    
    # Shutdown
    logger.info("Service shutdown completed")


# Create FastAPI app
app = FastAPI(
    title="Agent Builder LLM Services",
    description="LLM integration microservice using Python + LangChain",
    version="1.0.0",
    docs_url="/docs" if settings.app_mode.value == "development" else None,
    redoc_url="/redoc" if settings.app_mode.value == "development" else None,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Add compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log requests and responses."""
    start_time = time.time()
    
    # Call the next middleware/route
    response: Response = await call_next(request)
    
    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000
    
    # Log request/response
    log_request_response(
        method=request.method,
        path=str(request.url.path),
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    
    # Add response headers
    response.headers["X-Process-Time"] = str(duration_ms)
    response.headers["X-Service"] = settings.service_name
    
    return response


@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """Global error handling middleware."""
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger = get_logger(__name__)
        logger.error(
            "Unhandled exception in request",
            method=request.method,
            path=str(request.url.path),
            error=str(e),
        )
        
        from fastapi import HTTPException
        from fastapi.responses import JSONResponse
        
        # Return generic error response
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "error_code": "internal_error",
                "details": {"message": "An unexpected error occurred"},
            }
        )


# Include routes
app.include_router(router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.service_name,
        "version": "1.0.0",
        "mode": settings.app_mode.value,
        "status": "running",
        "docs": "/docs" if settings.app_mode.value == "development" else "disabled",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.app_mode.value == "development",
        log_level=settings.log_level.lower(),
    )