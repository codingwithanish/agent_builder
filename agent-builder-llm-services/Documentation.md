# 🧠 agent-builder-llm-services (Python + LangChain) — Developer Specification

## 1) Purpose & Scope
`agent-builder-llm-services` standardizes **LLM invocations** for the platform using **Python + LangChain**. It is called by `agent-builder-services` and returns **valid JSON** (schema‑validated when provided), with optional **SSE streaming**.

**Goals**
- Provider‑agnostic API over Bedrock, OpenAI, Anthropic, Azure OpenAI (extensible).
- Robust **JSON enforcement** (prompting → provider JSON modes → parsing/repair → schema validation).
- Credentials resolved from **headers → upstream config name → environment**.
- First‑class observability and a **Dummy** mode for local dev.

**Non‑Goals**
- Storing credentials or user profiles (kept in upstream services).
- Vector DB / RAG orchestration.
- Tool execution (handled elsewhere; this service only invokes LLMs).

---

## 2) Architecture Overview
```
agent-builder-services  ←→  agent-builder-llm-services  ←→  Provider Adapters
      (REST/SSE)                      (FastAPI)                 (LangChain)
```

**Tech stack**
- **FastAPI** (+ Uvicorn)
- **LangChain** (LCEL) + provider SDKs (`langchain-aws`, `langchain-openai`, `langchain-anthropic`, `azure-ai-inference` or `langchain-openai` for Azure)
- **AJV‑like validation** → `pydantic`/`jsonschema` (via `jsonschema` lib) + custom repair
- **SSE** → `sse-starlette` (or `EventSourceResponse`)
- **Logging** → `structlog` or `loguru`

**Folders**
```
src/
  app/
    main.py                # FastAPI app bootstrap
    routes.py              # REST & SSE endpoints
    deps.py                # dependency overrides (mode, config)
  core/
    config.py              # env loader (pydantic-settings)
    security.py            # header parsing, redaction
    observability.py       # logging, metrics hooks
  domain/
    schemas.py             # pydantic models for requests/responses
    interfaces.py          # LlmClient interface, types
    errors.py              # error taxonomy
  providers/
    base.py                # Base adapter
    bedrock.py             # Bedrock Runtime adapter
    openai.py              # OpenAI adapter
    anthropic.py           # Anthropic adapter
    azure_openai.py        # Azure OpenAI adapter
  services/
    invoke.py              # non-stream invoke orchestrator
    stream.py              # SSE stream orchestrator
    json_enforcer.py       # prompt rules, parsing & repair, schema validate
  utils/
    headers.py             # header → credential resolution
    json_repair.py         # tolerant JSON parsing/repair
  tests/
    unit/
    integration/
```

---

## 3) Credential & Config Resolution
**Request‑level precedence**
1) **Headers** (highest)
   - Common: `x-llm-provider` = `bedrock|openai|anthropic|azure-openai`
   - For **Bedrock**: `x-aws-access-key-id`, `x-aws-secret-access-key`, `x-aws-session-token?`, `x-aws-region`
   - For **OpenAI**: `x-openai-api-key`
   - For **Anthropic**: `x-anthropic-api-key`
   - For **Azure OpenAI**: `x-azure-openai-api-key`, `x-azure-openai-endpoint`, `x-azure-openai-deployment`
   - Optional: `x-llm-model` (default)
2) **Upstream config name**: `x-llm-config-name` (services layer looks up and forwards resolved provider + key; this service **does not** persist secrets)
3) **Environment**
   - `DEFAULT_LLM_PROVIDER`, `BEDROCK_REGION`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`

**Validation**
- Reject if no usable credentials for chosen provider.
- Optional **allowlists** per provider via env.
- Never log raw secrets; always redact in logs.

---

## 4) JSON Enforcement Strategy
1) **Prompt contract**: prepend a system rule: *“Return JSON only. No prose before/after.”*
2) **Provider JSON mode** when available (e.g., OpenAI `response_format={"type":"json_object"}`; Anthropic tool‑use patterns; Azure/Bedrock equivalents when supported).
3) **LCEL structured output**:
   - `model.with_structured_output(YourPydanticModel)` when supported; else `JsonOutputParser`.
4) **Post‑parse & Repair**:
   - Try `json.loads`; on failure, run `json_repair` (quote/brace fixes) then parse again.
5) **Schema validation** (optional): if client sends `json_schema`, validate; on failure include `validation.errors`.
6) **Strict mode**: if `strict=true`, return error when schema invalid; else return best‑effort JSON + errors.

---

## 5) Suggested REST & SSE APIs (v1)
All endpoints are **service‑to‑service**, called by `agent-builder-services`.

### 5.1 Invoke JSON (non‑streaming)
**POST** `/v1/llm/invoke-json`
- **Body**
```json
{
  "provider": "bedrock",
  "model": "anthropic.claude-3-5-sonnet",
  "messages": [
    { "role": "system", "content": "Return JSON only." },
    { "role": "user", "content": "Extract title and tags from: 'Hello world post'" }
  ],
  "jsonSchema": {
    "type": "object",
    "properties": {"title": {"type":"string"}, "tags": {"type":"array", "items": {"type":"string"}}},
    "required": ["title", "tags"]
  },
  "temperature": 0.2,
  "maxTokens": 4000,
  "strict": true,
  "extra": {"Anthropic-Tuning": "tool_use"}
}
```
- **Headers**: provider specific (see Section 3), plus `x-request-id`, `x-idempotency-key` (optional).
- **Response**
```json
{
  "ok": true,
  "provider": "bedrock",
  "model": "anthropic.claude-3-5-sonnet",
  "json": {"title":"Hello world post","tags":["hello","intro"]},
  "validation": {"valid": true},
  "usage": {"inputTokens": 45, "outputTokens": 32, "totalTokens": 77},
  "meta": {"finish_reason":"stop"}
}
```

### 5.2 Invoke (SSE streaming)
**POST** `/v1/llm/invoke-stream`  *(Response: text/event-stream)*
- **Body**: same as `/invoke-json`.
- **Events**
```
event: token
data: Hel

event: token
data: lo

event: partial_json
data: {"title":"Hello wor

event: final_json
data: {"title":"Hello world post","tags":["hello","intro"]}

event: usage
data: {"inputTokens":45,"outputTokens":32}
```

### 5.3 Test Connection
**POST** `/v1/llm/test`
- **Body**: `{ provider, apiKey?, region?, endpoint? }` or `{ configName }`
- **Response**: `{ ok: boolean, message?: string }`

### 5.4 List Models *(optional)*
**GET** `/v1/llm/models?provider=bedrock&region=us-east-1`
- **Response**: `{ models: string[] }`

### 5.5 Validate/Repair JSON *(utility)*
**POST** `/v1/llm/validate-json`
- **Body**: `{ text: string, jsonSchema?: any }`
- **Response**: `{ ok: boolean, json?: any, validation?: { valid: boolean, errors?: any[] } }`

### 5.6 Health & Metrics
- `GET /health` → `{ status: "ok" }`
- `GET /metrics` → Prometheus format

---

## 6) Provider Adapters (LangChain)
Each adapter implements a common `LlmClient` interface.

### 6.1 Bedrock Runtime (AWS)
- **LangChain**: `ChatBedrock` (via `langchain-aws`) or direct `boto3` with `BedrockRuntime`
- **Notes**: requires REGION and AWS credentials. For Anthropic‑on‑Bedrock, tool‑use available; otherwise use JSON parser.

### 6.2 OpenAI
- **LangChain**: `ChatOpenAI` (`langchain-openai`)
- **JSON mode**: `response_format={"type":"json_object"}`

### 6.3 Anthropic
- **LangChain**: `ChatAnthropic` (`langchain-anthropic`)
- **Notes**: use tool‑use patterns or strict prompting; enforce JSON with parser.

### 6.4 Azure OpenAI
- **LangChain**: `AzureChatOpenAI` (`langchain-openai` with Azure config)
- **Notes**: endpoint + deployment name required; supports JSON mode similar to OpenAI.

---

## 7) Example Chains (LCEL)

### 7.1 Structured Output with Pydantic
```python
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

class Extract(BaseModel):
    title: str
    tags: list[str]

prompt = ChatPromptTemplate.from_messages([
    ("system", "Return JSON only that matches the schema."),
    ("user", "Extract title and tags from: {text}")
])

model = ChatOpenAI(model="gpt-4o", temperature=0)
chain = prompt | model.with_structured_output(Extract)

result: Extract = chain.invoke({"text": "Hello world post"})
print(result.dict())
```

### 7.2 Generic JSON Parser
```python
from langchain_core.output_parsers import JsonOutputParser
from langchain_anthropic import ChatAnthropic

parser = JsonOutputParser()
model = ChatAnthropic(model="claude-3-5-sonnet", temperature=0)
prompt = """Return a valid JSON object with keys: title (string), tags (array of strings).
Text: {text}
"""
chain = prompt | model | parser
json_obj = chain.invoke({"text": "Hello world post"})
```

---

## 8) SSE Streaming with FastAPI
```python
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from app.services.stream import stream_invoke

router = APIRouter()

@router.post("/v1/llm/invoke-stream")
async def invoke_stream(req: Request):
    body = await req.json()
    async def event_generator():
        async for chunk in stream_invoke(body, req.headers):
            yield {"event": chunk["event"], "data": chunk["data"]}
    return EventSourceResponse(event_generator())
```

---

## 9) Environment Variables
- `PORT=5001`
- `APP_MODE=dummy|real`
- `DEFAULT_LLM_PROVIDER`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`
- `BEDROCK_REGION`
- `ALLOWED_MODELS` (CSV per provider)
- `LOG_LEVEL`, `SERVICE_NAME`

---

## 10) Validations & Limits
- **Credentials** present per provider.
- **Model allowlist** (if set) enforced.
- **Prompt/messages** size and `maxTokens` bounded.
- **Schema size** bounded; strict mode toggles hard errors.
- **Timeouts** and cancellation.

Error taxonomy: `validation_error (400)`, `unauthorized (401)`, `model_not_allowed (403)`, `rate_limited (429)`, `provider_unavailable (502)`, `timeout (503)`.

---

## 11) Observability
- **Logging**: structured with `request_id`, `provider`, `model`.
- **Metrics**: `llm_invoke_latency_ms`, `llm_tokens_input/output`, `llm_invoke_errors_total`.
- **Tracing**: wrap provider calls with OpenTelemetry spans.

---

## 12) Dummy Mode
- When `APP_MODE=dummy`, return canned JSON and stream a few synthetic tokens.

---

## 13) Developer Checklist
- [ ] Implement adapters (Bedrock/OpenAI/Anthropic/Azure) using LangChain and the `LlmClient` contract.
- [ ] JSON enforcement pipeline (prompt rules → provider JSON mode → parser/repair → schema validate).
- [ ] Non‑stream and SSE stream paths.
- [ ] Credential/header resolution + env fallback.
- [ ] Allowlist + input size validation.
- [ ] Logs/metrics/tracing.
- [ ] Dummy mode.

---

## 14) Summary
This service provides a **single, consistent JSON‑first interface** to multiple LLM providers using **LangChain**. It keeps credentials out of storage, supports SSE streaming, and ensures outputs are usable by downstream services without brittle parsing.

