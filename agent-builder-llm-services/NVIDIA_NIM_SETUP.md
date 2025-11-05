# NVIDIA NIM Integration Setup Guide

This guide explains how to set up and use the NVIDIA NIM integration for AI-powered workflow generation in Agent Builder.

## Overview

The Agent Builder uses two NVIDIA NIMs:
- **llama-3.1-nemotron-nano-8B-v1**: For intelligent workflow reasoning and JSON generation
- **nv-embedqa-e5-v5**: For semantic search over the catalog of agents and tools

## Architecture

```
User Chat Message
    ↓
agent-builder-ui (React Frontend)
    ↓
agent-builder-services (Node.js Orchestration)
    ↓
agent-builder-llm-services (Python FastAPI)
    ↓
NVIDIA NIMs
    ├─ Embedding NIM (nv-embedqa-e5-v5) → Semantic Catalog Search
    └─ Reasoning NIM (llama-3.1-nemotron-nano-8B-v1) → Workflow Generation
    ↓
Generated Workflow JSON
    ↓
Back to Frontend Canvas
```

## Setup Instructions

### 1. Get NVIDIA API Key

1. Visit [NVIDIA AI Playground](https://build.nvidia.com/)
2. Sign up or log in
3. Generate an API key from your account settings
4. Save the API key securely

### 2. Configure Environment Variables

Create or update `.env` file in `agent-builder-llm-services`:

```bash
# Copy from example
cp .env.example .env

# Edit .env and add your NVIDIA API key
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxx
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# Set app mode to real
APP_MODE=real

# Optional: Configure allowed models
ALLOWED_NVIDIA_MODELS=meta/llama-3.1-nemotron-nano-8b-v1,nvidia/nv-embedqa-e5-v5
```

### 3. Install Python Dependencies

```bash
cd agent-builder-llm-services
pip install -r requirements.txt
```

New dependencies added:
- `httpx` - For async HTTP requests to NVIDIA API
- `numpy` - For vector operations
- `scikit-learn` - For cosine similarity calculations

### 4. Start the Services

```bash
# Start LLM services (Python FastAPI)
cd agent-builder-llm-services
python -m src.app.main

# Start orchestration services (Node.js)
cd agent-builder-services
npm run dev

# Start UI (React)
cd agent-builder-ui
npm run dev
```

### 5. Verify Integration

Check health endpoint:
```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T...",
  "app_mode": "real"
}
```

## How It Works

### Retrieval-Augmented Generation (RAG) Flow

1. **User Input**: User types a workflow description (e.g., "Create a code review workflow")

2. **Embedding Generation**:
   - User query is embedded using `nv-embedqa-e5-v5`
   - Catalog items (agents/tools) were pre-embedded during initialization

3. **Semantic Search**:
   - Query embedding is compared with catalog embeddings
   - Top-K most relevant agents and tools are retrieved
   - Uses cosine similarity for ranking

4. **Context Augmentation**:
   - System prompt is built with retrieved agents and tools
   - Includes schema definition and examples
   - Provides clear instructions for JSON generation

5. **LLM Reasoning**:
   - `llama-3.1-nemotron-nano-8B-v1` receives augmented prompt
   - Generates workflow JSON with proper node/edge structure
   - Uses constrained decoding to ensure valid JSON schema

6. **Response Formatting**:
   - Generated JSON is validated
   - Response text is created
   - Workflow is sent to frontend canvas

### Example Prompt Flow

**User Query**: "code review with git"

**Step 1 - Embedding Search**:
```python
query_embedding = await nvidia_client.generate_embeddings(
    model="nvidia/nv-embedqa-e5-v5",
    texts=["code review with git"],
    input_type="query"
)
# Returns: [0.123, -0.456, 0.789, ...]

# Find similar agents/tools
relevant_agents = search(query_embedding, catalog_agents)
# Returns: [Code Reviewer (0.92), Text Summarizer (0.78), ...]

relevant_tools = search(query_embedding, catalog_tools)
# Returns: [Git Tool (0.95), File Parser (0.65), ...]
```

**Step 2 - Augmented Prompt**:
```
System: You are an expert AI workflow architect.

Available Agents:
- Code Reviewer (ID: ca5): Analyzes and reviews code for best practices
- Text Summarizer (ID: ca1): Summarizes long text content

Available Tools:
- Git Tool (ID: ct9): Git operations for version control
- File Parser (ID: ct2): Parses various file formats

Generate valid workflow JSON...

User: code review with git
```

**Step 3 - LLM Generation**:
```python
response = await nvidia_client.generate_completion(
    model="meta/llama-3.1-nemotron-nano-8b-v1",
    messages=[system_prompt, user_message],
    response_format={"type": "json_object", "schema": WORKFLOW_SCHEMA}
)
```

**Step 4 - Generated Workflow**:
```json
{
  "nodes": [
    {
      "id": "agent-1730851234567-1",
      "kind": "agent",
      "position": {"x": 300, "y": 200},
      "data": {"agentId": "ca5", "name": "Code Reviewer", "env": {}}
    },
    {
      "id": "tool-1730851234567-1",
      "kind": "tool",
      "position": {"x": 300, "y": 380},
      "data": {"toolId": "ct9", "name": "Git Tool", "env": {}}
    }
  ],
  "edges": [
    {"id": "edge-1730851234567-1", "source": "__INPUT__", "target": "agent-1730851234567-1"},
    {"id": "edge-1730851234567-2", "source": "agent-1730851234567-1", "sourceHandle": "tool-bottom", "target": "tool-1730851234567-1"},
    {"id": "edge-1730851234567-3", "source": "agent-1730851234567-1", "target": "__OUTPUT__"}
  ]
}
```

## Key Files

### Core Services

- **`src/services/nvidia_client.py`**: Low-level NVIDIA API client
  - `generate_completion()`: Call LLM for text/JSON generation
  - `generate_embeddings()`: Create embeddings for text

- **`src/services/embedding_service.py`**: Semantic search engine
  - `index_catalog()`: Pre-compute embeddings for all catalog items
  - `search()`: Find relevant agents/tools using cosine similarity
  - `get_relevant_components()`: RAG retrieval for workflow generation

- **`src/services/workflow_generator.py`**: Workflow generation logic
  - `generate_workflow()`: Main entry point for workflow generation
  - `_build_system_prompt()`: Creates augmented prompt with context
  - `_fallback_pattern_matching()`: Fallback when LLM unavailable

- **`src/services/service_manager.py`**: Singleton manager for services
  - Caches NVIDIA client, embedding service, workflow generator
  - Pre-indexes catalog on first request
  - Avoids re-initialization overhead

- **`src/services/catalog_data.py`**: Default catalog definitions
  - Lists all available agents and tools
  - Used for embedding index initialization

### Configuration

- **`src/core/config.py`**: Settings and environment variables
  - Added `nvidia_api_key` and `nvidia_base_url`
  - Added `LLMProvider.NVIDIA` enum
  - Added `allowed_nvidia_models` list

### API Routes

- **`src/app/routes.py`**: HTTP endpoints
  - `/api/chat/generate-flow`: Main endpoint for chat-based workflow generation
  - Checks for NVIDIA credentials and falls back to dummy mode if unavailable

## Testing

### 1. Test NVIDIA Connection

```bash
curl -X POST http://localhost:5001/api/chat/generate-flow \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a code review workflow",
    "history": []
  }'
```

Expected response:
```json
{
  "response": {
    "id": "msg-1730851234567",
    "role": "assistant",
    "content": "I've created a workflow for you with the following components: Code Reviewer, Git Tool, Text Summarizer...",
    "timestamp": "2025-11-05T..."
  },
  "generatedFlow": {
    "nodes": [...],
    "edges": [...],
    "description": "Code Review Workflow"
  }
}
```

### 2. Test Embedding Search

```bash
curl -X POST http://localhost:5001/api/chat/generate-flow \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need something to analyze customer feedback",
    "history": []
  }'
```

Should return workflow with:
- **Data Analyzer** or **Sentiment Analyzer** (semantic match)
- **Text Summarizer** (related to analysis)

### 3. Test in UI

1. Open Agent Builder UI: `http://localhost:4000`
2. Create a new flow
3. Click "AI Chat" tab in right sidebar
4. Type: "Create a code review workflow with Git integration"
5. Click Send
6. Verify nodes appear on canvas with proper connections

## Troubleshooting

### Error: "NVIDIA API key is required"

**Solution**: Ensure `NVIDIA_API_KEY` is set in `.env` file

### Error: "Connection timeout"

**Solution**: Check internet connection and NVIDIA API status at https://status.nvidia.com

### Fallback to Dummy Mode

If NVIDIA NIMs are unavailable, the system automatically falls back to pattern-matching mode:
- Still works but less intelligent
- Uses keyword matching instead of semantic search
- Limited to predefined workflow patterns

Check logs for:
```
Error using NVIDIA NIMs, falling back to dummy mode
```

### Embedding Service Not Indexing

**Issue**: Catalog not being embedded on startup

**Solution**: Check logs for embedding initialization:
```python
# Should see in logs
INFO: Indexing catalog with 15 items
INFO: Indexed agent: Text Summarizer
INFO: Indexed tool: Git Tool
...
```

### JSON Schema Validation Errors

**Issue**: LLM generating invalid JSON

**Solution**:
1. Check if `response_format` is being passed to LLM
2. Verify WORKFLOW_SCHEMA is valid
3. Add post-validation in `workflow_generator.py`

## Performance Optimization

### Caching

- Catalog embeddings are cached in-memory (EmbeddingService)
- Service instances are reused via ServiceManager
- No re-indexing on subsequent requests

### Token Usage

- Retrieval limits context to top-5 agents and top-5 tools
- Conversation history truncated to last 3 messages
- Reduces prompt tokens from ~5000 to ~1500

### Response Time

Expected latencies:
- Embedding generation: 50-100ms
- Semantic search: 5-10ms (in-memory)
- LLM reasoning: 1-3 seconds
- **Total**: ~2-4 seconds per workflow generation

## Production Considerations

### Vector Database

For production, replace in-memory storage with a vector database:
- **Pinecone**: Fully managed, easy setup
- **Weaviate**: Open source, self-hosted
- **Qdrant**: Fast, Rust-based

Update `embedding_service.py`:
```python
from pinecone import Pinecone

class EmbeddingService:
    def __init__(self):
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index = self.pc.Index("agent-catalog")

    async def search(self, query: str, top_k: int = 5):
        query_embedding = await self.nvidia_client.generate_embeddings(...)
        results = self.index.query(vector=query_embedding, top_k=top_k)
        return results
```

### Rate Limiting

Add rate limiting for NVIDIA API calls:
```python
from aiolimiter import AsyncLimiter

rate_limiter = AsyncLimiter(max_rate=10, time_period=1)  # 10 req/sec

async def generate_completion(self, ...):
    async with rate_limiter:
        response = await client.post(...)
```

### Error Handling

Enhance error handling with retries:
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate_completion(self, ...):
    # Will retry up to 3 times with exponential backoff
```

### Monitoring

Add observability:
- Log all NVIDIA API calls with request IDs
- Track embedding cache hit rates
- Monitor LLM generation latency
- Alert on fallback mode activation

## Support

For issues or questions:
- Check logs in `agent-builder-llm-services/logs/`
- Review NVIDIA NIM documentation: https://docs.nvidia.com/nim/
- Contact support or open GitHub issue

---

**Built with NVIDIA NIMs • Agent Builder • AI-Powered Workflows**
