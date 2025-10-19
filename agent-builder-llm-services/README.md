# Agent Builder LLM Services

A Python + LangChain microservice for standardized LLM invocations across multiple providers with robust JSON enforcement and real-time streaming.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic, AWS Bedrock, Azure OpenAI
- **JSON-First Approach**: Robust JSON enforcement with validation and repair
- **Streaming Support**: Server-Sent Events (SSE) for real-time responses
- **Credential Management**: Flexible credential resolution from headers, config, or environment
- **Schema Validation**: JSON schema validation with detailed error reporting
- **Observability**: Structured logging, Prometheus metrics, and OpenTelemetry tracing
- **Dummy Mode**: Local development mode with synthetic responses

## Quick Start

### Prerequisites

- Python 3.10+
- API keys for desired LLM providers

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the service:
```bash
# Development mode
python -m src.app.main

# Or with uvicorn
uvicorn src.app.main:app --host 0.0.0.0 --port 5001 --reload
```

The service will start on `http://localhost:5001`

## Configuration

Key environment variables:

```env
# Server
PORT=5001
APP_MODE=real  # or 'dummy' for testing
LOG_LEVEL=INFO

# Provider Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your_deployment

# AWS Bedrock (uses AWS SDK credential chain)
BEDROCK_REGION=us-east-1

# Model Allowlists (optional)
ALLOWED_OPENAI_MODELS=gpt-4o,gpt-4-turbo,gpt-3.5-turbo
ALLOWED_ANTHROPIC_MODELS=claude-3-5-sonnet-20241022,claude-3-sonnet-20240229
```

## API Endpoints

### Core LLM Operations

#### POST /v1/llm/invoke-json
Invoke LLM and return JSON response.

```bash
curl -X POST http://localhost:5001/v1/llm/invoke-json \
  -H "Content-Type: application/json" \
  -H "x-openai-api-key: your_key" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Extract title and tags from: Hello world post"}
    ],
    "jsonSchema": {
      "type": "object",
      "properties": {
        "title": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["title", "tags"]
    },
    "temperature": 0.2,
    "strict": true
  }'
```

#### POST /v1/llm/invoke-stream
Stream LLM response as SSE events.

```bash
curl -N -H "Accept: text/event-stream" \
  -H "x-anthropic-api-key: your_key" \
  -X POST http://localhost:5001/v1/llm/invoke-stream \
  -d '{"provider": "anthropic", "model": "claude-3-5-sonnet-20241022", ...}'
```

### Utility Endpoints

#### POST /v1/llm/test
Test provider connection.

#### GET /v1/llm/models?provider=openai
List available models.

#### POST /v1/llm/validate-json
Validate and repair JSON.

#### GET /health
Service health check.

#### GET /metrics
Prometheus metrics.

## Credential Resolution

Credentials are resolved in this order:

1. **Request Headers** (highest priority):
   ```
   x-llm-provider: openai
   x-openai-api-key: your_key
   
   # For Bedrock
   x-aws-access-key-id: your_access_key
   x-aws-secret-access-key: your_secret_key
   x-aws-region: us-east-1
   
   # For Azure OpenAI
   x-azure-openai-api-key: your_key
   x-azure-openai-endpoint: https://your-resource.openai.azure.com/
   x-azure-openai-deployment: your_deployment
   ```

2. **Environment Variables**:
   ```
   OPENAI_API_KEY=your_key
   ANTHROPIC_API_KEY=your_key
   AZURE_OPENAI_API_KEY=your_key
   ```

3. **AWS SDK Credential Chain** (for Bedrock)

## JSON Enforcement

The service ensures JSON responses through multiple strategies:

1. **Enhanced Prompting**: Adds JSON-specific instructions
2. **Provider JSON Modes**: Uses native JSON modes when available
3. **LangChain Structured Output**: Leverages LangChain's structured output features
4. **JSON Repair**: Attempts to fix malformed JSON
5. **Schema Validation**: Validates against provided JSON schemas

## Streaming Events

SSE streaming provides these event types:

- `token`: Individual content tokens
- `partial_json`: Partial JSON as it's generated
- `final_json`: Complete JSON response
- `validation`: Schema validation results
- `usage`: Token usage information
- `done`: Completion signal
- `error`: Error information

## Development

### Dummy Mode

Set `APP_MODE=dummy` for local development without API keys:

```bash
export APP_MODE=dummy
python -m src.app.main
```

### Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=src

# Type checking
mypy src

# Linting
ruff check src
black src
```

### Project Structure

```
src/
├── app/           # FastAPI application
├── core/          # Configuration and observability
├── domain/        # Domain models and interfaces
├── providers/     # LLM provider adapters
├── services/      # Business logic services
└── utils/         # Utility functions
```

## Error Handling

The service provides detailed error responses:

```json
{
  "error": "Model 'gpt-5' not allowed for provider 'openai'",
  "error_code": "model_not_allowed",
  "details": {
    "provider": "openai",
    "model": "gpt-5",
    "allowed_models": ["gpt-4o", "gpt-4-turbo"]
  }
}
```

Error codes include:
- `validation_error` (400)
- `unauthorized` (401)
- `model_not_allowed` (403)
- `rate_limited` (429)
- `provider_unavailable` (502)
- `timeout` (503)

## Observability

### Structured Logging

All logs use structured JSON format with request tracing:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "event": "llm_invocation",
  "request_id": "req-123",
  "provider": "openai",
  "model": "gpt-4o",
  "input_tokens": 45,
  "output_tokens": 32,
  "duration_ms": 1250
}
```

### Metrics

Prometheus metrics available at `/metrics`:

- `llm_invoke_total`: Total invocations by provider/model/status
- `llm_invoke_duration_seconds`: Invocation duration histogram
- `llm_tokens_total`: Token usage by provider/model/type
- `llm_errors_total`: Error counts by provider/type

### Request Tracing

Include `x-request-id` header for request tracing across logs.

## Security

- API keys are never logged (automatically redacted)
- Input validation on all endpoints
- CORS configuration for cross-origin requests
- Rate limiting ready (configure with reverse proxy)

## Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src/ src/
EXPOSE 5001

CMD ["python", "-m", "src.app.main"]
```

## License

MIT License - see LICENSE file for details.