# Agent Builder API Documentation

## Overview

This document provides comprehensive API specifications for the Agent Builder backend services. The API supports both flow management, LLM configuration, resource management, and marketplace operations.

**Base URL**: `{VITE_API_BASE_URL}` (configurable via environment)  
**Content-Type**: `application/json` for all requests unless specified  
**Authentication**: Bearer token (implementation dependent)

---

## Table of Contents

1. [Flow Management APIs](#flow-management-apis)
2. [LLM Configuration APIs](#llm-configuration-apis)
3. [Resource Management APIs](#resource-management-apis)
4. [Catalog & Marketplace APIs](#catalog--marketplace-apis)
5. [Real-time Updates (WebSocket/SSE)](#real-time-updates)
6. [Error Handling](#error-handling)
7. [Data Models](#data-models)

---

## Flow Management APIs

### 1. List Flows

**Endpoint**: `GET /flows`  
**Description**: Retrieve all flows for the authenticated user

**Request**:
```http
GET /flows
Authorization: Bearer {token}
```

**Response**:
```json
{
  "flows": [
    {
      "id": "flow-1698765432000",
      "name": "Customer Support Flow",
      "description": "Automated customer support with sentiment analysis",
      "llmName": "Claude-Primary",
      "nodes": [
        {
          "id": "input-1",
          "kind": "input",
          "position": { "x": 100, "y": 200 },
          "data": { "name": "Input" },
          "status": "deployed"
        },
        {
          "id": "agent-1",
          "kind": "agent",
          "position": { "x": 300, "y": 200 },
          "data": {
            "name": "Sentiment Analyzer",
            "description": "Analyzes customer sentiment",
            "llmName": "Claude-Primary",
            "env": {
              "API_KEY": "***",
              "THRESHOLD": "0.8"
            }
          },
          "status": "deployed"
        },
        {
          "id": "output-1",
          "kind": "output",
          "position": { "x": 500, "y": 200 },
          "data": { "name": "Output" },
          "status": "deployed"
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": "input-1",
          "target": "agent-1",
          "label": "",
          "color": "default"
        },
        {
          "id": "edge-2",
          "source": "agent-1",
          "target": "output-1",
          "label": "",
          "color": "default"
        }
      ],
      "status": "deployed",
      "createdAt": "2025-10-17T10:30:32Z",
      "updatedAt": "2025-10-17T11:45:12Z"
    }
  ]
}
```

### 2. Get Single Flow

**Endpoint**: `GET /flows/{id}`  
**Description**: Retrieve a specific flow by ID

**Request**:
```http
GET /flows/flow-1698765432000
Authorization: Bearer {token}
```

**Response**: Same as single flow object from list above

**Error Responses**:
```json
{
  "error": "Flow not found",
  "code": "FLOW_NOT_FOUND",
  "message": "Flow with ID 'flow-1698765432000' does not exist"
}
```

### 3. Create Flow

**Endpoint**: `POST /flows`  
**Description**: Create a new flow with Input and Output nodes

**Request**:
```json
{
  "name": "Customer Support Flow",
  "description": "Automated customer support with sentiment analysis",
  "llmName": "Claude-Primary"
}
```

**Validation Rules**:
- `name`: Required, max 25 characters
- `description`: Optional, max 500 characters  
- `llmName`: Required, must match existing LLM name

**Response**:
```json
{
  "id": "flow-1698765432000",
  "name": "Customer Support Flow",
  "description": "Automated customer support with sentiment analysis",
  "llmName": "Claude-Primary",
  "nodes": [
    {
      "id": "input-1",
      "kind": "input", 
      "position": { "x": 100, "y": 200 },
      "data": { "name": "Input" },
      "status": "draft"
    },
    {
      "id": "output-1",
      "kind": "output",
      "position": { "x": 600, "y": 200 },
      "data": { "name": "Output" },
      "status": "draft"
    }
  ],
  "edges": [],
  "status": "draft",
  "createdAt": "2025-10-17T12:00:00Z",
  "updatedAt": "2025-10-17T12:00:00Z"
}
```

### 4. Update/Save Flow

**Endpoint**: `PUT /flows/{id}`  
**Description**: Update flow configuration, nodes, and edges

**Request**:
```json
{
  "name": "Updated Flow Name",
  "description": "Updated description", 
  "llmName": "Claude-Primary",
  "nodes": [
    {
      "id": "input-1",
      "kind": "input",
      "position": { "x": 100, "y": 200 },
      "data": { "name": "Input" },
      "status": "draft"
    },
    {
      "id": "agent-1", 
      "kind": "agent",
      "position": { "x": 300, "y": 200 },
      "data": {
        "name": "Sentiment Analyzer",
        "description": "Analyzes customer sentiment",
        "llmName": "Claude-Primary",
        "env": {
          "API_KEY": "sk-xxx",
          "THRESHOLD": "0.8"
        }
      },
      "status": "draft"
    },
    {
      "id": "output-1",
      "kind": "output", 
      "position": { "x": 500, "y": 200 },
      "data": { "name": "Output" },
      "status": "draft"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "input-1",
      "target": "agent-1",
      "label": "",
      "color": "default"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Flow updated successfully",
  "updatedAt": "2025-10-17T12:30:00Z"
}
```

### 5. Deploy/Publish Flow

**Endpoint**: `POST /flows/{id}/deploy`  
**Description**: Deploy flow to production environment

**Request**:
```http
POST /flows/flow-1698765432000/deploy
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "message": "Flow deployment initiated",
  "deploymentId": "deploy-1698765432000"
}
```

**Real-time Updates**: This endpoint triggers real-time status updates via WebSocket/SSE for each node:
```json
{
  "type": "node:status",
  "flowId": "flow-1698765432000",
  "nodeId": "agent-1", 
  "status": "deploying",
  "timestamp": "2025-10-17T12:35:00Z"
}
```

### 6. Test Flow

**Endpoint**: `POST /flows/{id}/test`  
**Description**: Execute flow with test input

**Request**:
```json
{
  "payload": {
    "threadId": "test-thread-123",
    "input": {
      "message": "I'm very frustrated with your service!",
      "userId": "user-456"
    },
    "metadata": {
      "source": "chat",
      "priority": "high"
    }
  }
}
```

**Response**:
```json
{
  "output": {
    "result": {
      "sentiment": "negative",
      "confidence": 0.95,
      "response": "I understand your frustration. Let me help you resolve this issue.",
      "escalated": true
    },
    "executionTime": 2.3,
    "nodesExecuted": 3,
    "timestamp": "2025-10-17T12:40:00Z"
  }
}
```

---

## LLM Configuration APIs

### 1. List LLMs

**Endpoint**: `GET /llms`  
**Description**: Get all configured LLMs for the user

**Request**:
```http
GET /llms
Authorization: Bearer {token}
```

**Response**:
```json
{
  "llms": [
    {
      "id": "llm-1698765432000",
      "name": "Claude-Primary",
      "model": "bedrock:claude-v3",
      "apiKeyMasked": "***key***",
      "createdAt": "2025-10-15T00:00:00Z"
    },
    {
      "id": "llm-1698765432001", 
      "name": "GPT-4-Backup",
      "model": "openai:gpt-4",
      "apiKeyMasked": "***1234",
      "createdAt": "2025-10-16T10:00:00Z"
    }
  ]
}
```

### 2. Create LLM

**Endpoint**: `POST /llms`  
**Description**: Configure a new LLM connection

**Request**:
```json
{
  "name": "Claude-Primary",
  "model": "bedrock:claude-v3",
  "apiKey": "sk-ant-api03-xxx"
}
```

**Validation Rules**:
- `name`: Required, unique per user
- `model`: Required, supported models:
  - `bedrock:claude-v3`
  - `bedrock:claude-v3.5`
  - `openai:gpt-4`
  - `openai:gpt-3.5-turbo`
- `apiKey`: Required, will be encrypted and masked in responses

**Response**:
```json
{
  "id": "llm-1698765432000",
  "name": "Claude-Primary", 
  "model": "bedrock:claude-v3",
  "apiKeyMasked": "***api03-xxx",
  "createdAt": "2025-10-17T12:00:00Z"
}
```

### 3. Test LLM Connection

**Endpoint**: `POST /llm/test`  
**Description**: Test LLM connectivity before saving

**Request**:
```json
{
  "model": "bedrock:claude-v3",
  "apiKey": "sk-ant-api03-xxx"
}
```

**Success Response**:
```json
{
  "ok": true,
  "message": "LLM connection verified",
  "latency": 245,
  "model_info": {
    "name": "Claude 3 Sonnet",
    "version": "20240229"
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "message": "Unable to connect to LLM. Check model and API key.",
  "error_code": "INVALID_API_KEY",
  "details": "The provided API key is invalid or expired"
}
```

---

## Resource Management APIs

### 1. Upload Resource

**Endpoint**: `POST /resources/upload`  
**Description**: Upload files (agents, tools, configurations)

**Request** (multipart/form-data):
```http
POST /resources/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

name: "Customer Service Agent"
file: [binary file data]
```

**File Validation**:
- **Size**: Max 50MB
- **Types**: `.zip`, `.json`, `.yaml`, `.yml`, `.js`, `.ts`
- **Content**: Validate file structure for agent/tool definitions

**Response**:
```json
{
  "id": "resource-1698765432000",
  "name": "Customer Service Agent",
  "filename": "customer-agent.zip",
  "size": 2048576,
  "kind": "agent",
  "createdAt": "2025-10-17T12:00:00Z",
  "downloadUrl": "/resources/resource-1698765432000/download"
}
```

**Error Response**:
```json
{
  "error": "File too large",
  "code": "FILE_SIZE_EXCEEDED", 
  "message": "File size 52428800 bytes exceeds maximum allowed size of 50MB",
  "maxSize": 52428800
}
```

---

## Catalog & Marketplace APIs

### 1. List Catalog Items

**Endpoint**: `GET /catalog/{type}`  
**Description**: Get user's catalog items by type

**Parameters**:
- `type`: `agents` | `tools`

**Request**:
```http
GET /catalog/agents
Authorization: Bearer {token}
```

**Response**:
```json
{
  "items": [
    {
      "id": "ca1",
      "kind": "agent",
      "name": "Text Summarizer",
      "description": "Summarizes long text content",
      "status": "deployed",
      "version": "1.2.0",
      "author": "user@example.com",
      "tags": ["nlp", "summarization"],
      "createdAt": "2025-10-15T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
```

### 2. List Marketplace Items

**Endpoint**: `GET /market/{type}`  
**Description**: Browse public marketplace items

**Parameters**:
- `type`: `agents` | `tools`
- Query params: `?page=1&size=20&category=nlp&search=summarizer`

**Request**:
```http
GET /market/agents?category=nlp&search=summarizer
```

**Response**:
```json
{
  "items": [
    {
      "id": "ma1",
      "kind": "agent", 
      "name": "Advanced Summarizer",
      "description": "AI agent that summarizes text content with customizable length",
      "version": "2.1.0",
      "author": "marketplace@example.com",
      "downloads": 1250,
      "rating": 4.8,
      "tags": ["nlp", "summarization", "ai"],
      "category": "nlp",
      "license": "MIT",
      "documentation": "https://docs.example.com/summarizer",
      "createdAt": "2025-10-10T00:00:00Z",
      "updatedAt": "2025-10-15T00:00:00Z"
    }
  ],
  "total": 23,
  "page": 1,
  "pageSize": 20,
  "filters": {
    "categories": ["nlp", "vision", "audio"],
    "licenses": ["MIT", "Apache-2.0", "GPL-3.0"]
  }
}
```

### 3. Add Marketplace Item to Catalog

**Endpoint**: `POST /market/{id}/add`  
**Description**: Add marketplace item to user's catalog

**Request**:
```json
{
  "kind": "agent"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Item added to catalog successfully",
  "catalogItemId": "ca-new-123"
}
```

---

## Real-time Updates

### WebSocket Connection

**Endpoint**: `ws://{base_url}/ws/flows/{flowId}`  
**Description**: Real-time updates during deployment

**Connection**:
```javascript
const ws = new WebSocket('ws://localhost:4000/ws/flows/flow-1698765432000');
```

**Message Types**:

#### Node Status Update
```json
{
  "type": "node:status",
  "flowId": "flow-1698765432000", 
  "nodeId": "agent-1",
  "status": "deploying",
  "timestamp": "2025-10-17T12:35:00Z",
  "message": "Initializing agent dependencies"
}
```

#### Deployment Complete
```json
{
  "type": "deployment:complete",
  "flowId": "flow-1698765432000",
  "status": "deployed",
  "deploymentTime": 45.2,
  "timestamp": "2025-10-17T12:36:00Z"
}
```

#### Error During Deployment
```json
{
  "type": "node:error",
  "flowId": "flow-1698765432000",
  "nodeId": "agent-2", 
  "status": "failed",
  "error": {
    "code": "DEPENDENCY_ERROR",
    "message": "Failed to install required dependencies",
    "details": "Package 'pandas==2.0.0' not found"
  },
  "timestamp": "2025-10-17T12:35:30Z"
}
```

### Server-Sent Events (Alternative)

**Endpoint**: `GET /flows/{id}/events`  
**Description**: Alternative to WebSocket for real-time updates

**Request**:
```http
GET /flows/flow-1698765432000/events
Authorization: Bearer {token}
Accept: text/event-stream
```

**Response Stream**:
```
data: {"type":"node:status","nodeId":"agent-1","status":"deploying"}

data: {"type":"node:status","nodeId":"agent-1","status":"deployed"}

data: {"type":"deployment:complete","status":"deployed"}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error title",
  "code": "ERROR_CODE",
  "message": "Detailed error message",
  "details": "Additional context or debug information",
  "timestamp": "2025-10-17T12:00:00Z",
  "requestId": "req-1698765432000"
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully  
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate name)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Error Codes

```json
{
  "FLOW_NOT_FOUND": "Requested flow does not exist",
  "INVALID_FLOW_NAME": "Flow name contains invalid characters",
  "LLM_NOT_FOUND": "Specified LLM configuration not found", 
  "LLM_CONNECTION_FAILED": "Cannot connect to LLM service",
  "FILE_TOO_LARGE": "Uploaded file exceeds size limit",
  "INVALID_FILE_TYPE": "File type not supported",
  "DEPLOYMENT_FAILED": "Flow deployment failed",
  "VALIDATION_ERROR": "Request validation failed",
  "RATE_LIMIT_EXCEEDED": "Too many requests"
}
```

---

## Data Models

### Flow Object
```typescript
interface FlowGraph {
  id: string;
  name: string; // max 25 chars
  description?: string;
  llmName: string; // LLM name reference
  nodes: RFNode[];
  edges: RFEdge[];
  status: 'draft' | 'deploying' | 'deployed' | 'failed';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Node Object
```typescript
interface RFNode<T=any> {
  id: string;
  kind: 'input'|'output'|'agent'|'agentFlow'|'tool'|'condition'|'human';
  position: { x: number; y: number };
  data: T; // Node-specific data
  status?: 'draft' | 'deploying' | 'deployed' | 'failed';
}
```

### Agent Node Data
```typescript
interface AgentNodeData {
  agentId?: string;
  name: string;
  description?: string;
  llmName?: string;
  env: Record<string,string>;
  attachedToolIds?: string[];
}
```

### Condition Node Data
```typescript
interface ConditionNodeData {
  name: string;
  description?: string;
  scriptType: 'python'|'javascript';
  script: string; // source code
}
```

### Human Node Data
```typescript
interface HumanNodeData {
  name: string;
  ask: string; // question for user
  promptConfig: string; // template with $input
  inputValidator: string; // validation script
}
```

---

## Authentication & Security

### API Key Authentication
```http
Authorization: Bearer {jwt_token}
```

### Rate Limiting
- **General APIs**: 100 requests/minute
- **File Upload**: 10 uploads/minute  
- **LLM Test**: 5 tests/minute
- **WebSocket**: 1 connection per flow per user

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## Development & Testing

### Environment Variables
```env
# API Configuration
API_PORT=4000
API_HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/agent_builder

# LLM Services
BEDROCK_REGION=us-east-1
OPENAI_BASE_URL=https://api.openai.com/v1

# File Storage
UPLOAD_PATH=/uploads
MAX_FILE_SIZE=52428800

# Security
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
```

### Test Endpoints

#### Health Check
```http
GET /health
```
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "llm_services": "available"
  }
}
```

#### API Status
```http
GET /api/status
```
```json
{
  "api_version": "v1",
  "supported_models": [
    "bedrock:claude-v3",
    "bedrock:claude-v3.5", 
    "openai:gpt-4",
    "openai:gpt-3.5-turbo"
  ],
  "max_file_size": 52428800,
  "rate_limits": {
    "general": "100/min",
    "upload": "10/min",
    "llm_test": "5/min"
  }
}
```

---

## Deployment Considerations

### Database Schema
- **flows** table: Store flow definitions
- **nodes** table: Store node configurations  
- **llm_configs** table: Store LLM configurations (encrypted API keys)
- **resources** table: Store uploaded file metadata
- **deployments** table: Track deployment history
- **users** table: User management

### Message Queue
- Use Redis/RabbitMQ for deployment status updates
- Queue deployment tasks for async processing
- Broadcast status updates to WebSocket connections

### File Storage
- Use S3/MinIO for uploaded files
- Generate signed URLs for secure file access
- Implement virus scanning for uploaded files

### Monitoring
- Log all API requests and responses
- Monitor deployment success/failure rates
- Track LLM API usage and costs
- Alert on error rates and latency spikes

---

This comprehensive API documentation provides everything needed to implement the backend services for the Agent Builder application. All endpoints, payload structures, error handling, and real-time features are fully specified.