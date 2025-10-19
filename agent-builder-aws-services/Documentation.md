# 🧱 AGENT-BUILDER-AWS-SERVICES

## 1) Overview
`agent-builder-aws-services` is a Node.js + TypeScript microservice that handles **all AWS-related operations** in the Agent Builder platform. It enables the platform to manage, deploy, and invoke AI and MCP workloads across different AWS services such as S3, ECS, Lambda, and Bedrock.

---

## 2) Core Responsibilities
- **Artifact Management:** Upload and store MCP tools, Bedrock AgentCore packages, and other files in S3.
- **Deployment:** Deploy Bedrock Agents, AgentCore packages, and MCP servers.
- **Invocation:** Invoke Bedrock Agents and models.
- **Event Streaming:** Stream deployment or runtime updates via WebSocket.
- **Credential Management:** Use AWS credentials from request headers or environment variables.
- **Validation & Security:** Handle API key validation, region checks, and AWS role assumptions.

---

## 3) Architecture
```
┌─────────────────────────────┐
│     Agent Builder UI        │
└──────────────┬──────────────┘
               │ REST / WS
┌──────────────▼──────────────┐
│  agent-builder-services     │
└──────────────┬──────────────┘
               │ REST / WS
┌──────────────▼──────────────┐
│ agent-builder-aws-services  │
│─────────────────────────────│
│ • S3 Artifact Service       │
│ • Bedrock Deploy Service    │
│ • MCP Deploy Service        │
│ • Invocation Service        │
│ • Credential Resolver       │
│ • Validation Layer          │
└─────────────────────────────┘
               │
          ┌────┴────┐
          │   AWS   │
          └─────────┘
```

---

## 4) Environment Configuration
| Variable | Description |
|-----------|-------------|
| `DEFAULT_AWS_REGION` | Default AWS region (e.g., `us-east-1`) |
| `S3_ARTIFACT_BUCKET` | Default S3 bucket name |
| `LOG_LEVEL` | Logging verbosity level |
| `ALLOW_HEADER_CREDS` | Allow credential overrides via headers |
| `ARTIFACT_MAX_MB` | Max upload size in MB |
| `DEPLOY_TARGET` | Default deployment type: `ecs` or `lambda` |
| `WS_ENABLED` | Enable WebSocket updates |
| `SERVICE_NAME` | Service identifier |

---

## 5) AWS Credential Handling
**Order of resolution:**
1. From headers (preferred)
   - `x-aws-access-key-id`
   - `x-aws-secret-access-key`
   - `x-aws-session-token` *(optional)*
   - `x-aws-region` *(optional)*
2. From environment variables
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
3. Default AWS SDK provider chain or IAM role

If a `roleArn` is passed via header, the system will assume that role using STS and use the temporary credentials for the current request.

---

## 6) Service Modules
```
src/
  app/           # bootstrap, http/ws server
  config/        # env loader, credential resolver
  domain/        # DTOs, types, interfaces
  adapters/      # AWS clients (S3, ECS, Lambda, Bedrock, STS)
  services/      # business logic: artifact, deploy, invoke
  events/        # WebSocket / EventBridge emitter
  observability/ # logging, metrics, tracing
```

### Interfaces
- `ArtifactStoragePort`
- `AgentDeployPort`
- `McpDeployPort`
- `InvocationPort`
- `CredentialProviderPort`

---

## 7) Key Features and AWS SDK APIs

### 7.1 Upload artifacts (MCP tools, AgentCore packages)
**Actions:**
1. Validate file and bucket.
2. Upload to S3 (multipart if needed).
3. Return file URI and metadata.

**AWS SDK v3 APIs:**
- `S3Client`
- `CreateBucket`, `PutObject`, `CreateMultipartUpload`, `UploadPart`, `CompleteMultipartUpload`

**API Endpoint Suggestion:**
- `POST /artifacts/upload`
- `GET /artifacts/:key`

---

### 7.2 Deploy Bedrock Agent / AgentCore
**Actions:**
1. Create or update agent.
2. Prepare and alias agent.
3. Stream deployment updates.

**AWS SDK v3 APIs:**
- `BedrockAgentClient`
- `CreateAgent`, `UpdateAgent`, `PrepareAgent`, `CreateAgentAlias`

**API Endpoint Suggestion:**
- `POST /bedrock/deploy`
- `GET /bedrock/status/:agentId`

---

### 7.3 Deploy MCP Server
**Options:**
- ECS (preferred for long-running MCP servers)
- Lambda (for short-lived executions)

**AWS SDK v3 APIs:**
- ECS: `RegisterTaskDefinition`, `CreateService`, `UpdateService`, `DescribeServices`
- Lambda: `CreateFunction`, `UpdateFunctionCode`, `GetFunction`

**API Endpoint Suggestion:**
- `POST /mcp/deploy`
- `GET /mcp/status/:serviceName`

---

### 7.4 Invoke Agent / AgentCore
**Actions:**
- Use Bedrock Agent Runtime to invoke an existing agent.
- Stream responses back to the client.

**AWS SDK v3 APIs:**
- `BedrockAgentRuntimeClient`: `InvokeAgent`
- `BedrockRuntimeClient`: `Converse`, `InvokeModel`

**API Endpoint Suggestion:**
- `POST /bedrock/invoke`

---

### 7.5 Knowledge Base Management *(optional)*
**AWS SDK v3 APIs:**
- `CreateKnowledgeBase`, `CreateDataSource`, `StartIngestionJob`

**API Endpoint Suggestion:**
- `POST /bedrock/kb`
- `POST /bedrock/kb/ingest`

---

## 8) Validations
- File size and type validation for uploads.
- Region validation for Bedrock.
- Credential validation via `GetCallerIdentity`.
- Agent deployment parameter checks.
- MCP configuration validation (runtime, handler, memory).

---

## 9) WebSocket Events
| Event | Description | Payload |
|--------|--------------|----------|
| `deploy:progress` | Deployment step update | `{ id, step, progress }` |
| `deploy:complete` | Deployment completed | `{ id, status }` |
| `invoke:result` | Agent invocation result | `{ id, output }` |

---

## 10) Error Handling & Logging
- Retry transient AWS errors (S3 5xx, throttling) with exponential backoff.
- Structured logging via Pino.
- Custom `AppError` class for clear error taxonomy.

---

## 11) IAM & Security
- Private S3 buckets with KMS encryption.
- Scoped IAM roles for Agent deploy and MCP ECS/Lambda execution.
- Deny wildcard `*` permissions.

---

## 12) Suggested REST API Endpoints
| Method | Path | Description |
|---------|------|--------------|
| `POST` | `/artifacts/upload` | Upload MCP tool or AgentCore package to S3 |
| `GET` | `/artifacts/:key` | Retrieve file metadata or URL |
| `POST` | `/bedrock/deploy` | Deploy Bedrock Agent / AgentCore package |
| `GET` | `/bedrock/status/:agentId` | Check Bedrock deployment status |
| `POST` | `/bedrock/invoke` | Invoke deployed Bedrock Agent |
| `POST` | `/mcp/deploy` | Deploy MCP server (ECS / Lambda) |
| `GET` | `/mcp/status/:serviceName` | Get MCP service deployment status |
| `POST` | `/bedrock/kb` | Create Bedrock knowledge base |
| `POST` | `/bedrock/kb/ingest` | Start ingestion for KB |

---

## 13) Developer Checklist
- [ ] Credential resolver and validation
- [ ] S3 upload with multipart support
- [ ] Bedrock Agent create, prepare, alias flow
- [ ] ECS/Lambda deployment for MCP
- [ ] Bedrock Agent invocation endpoint
- [ ] WebSocket event handling
- [ ] Logging and metrics setup
- [ ] Error handling with retry policy

---

## 14) Summary
The `agent-builder-aws-services` microservice is the **AWS integration layer** of the Agent Builder platform. It provides modular, extensible APIs to manage Bedrock agents, deploy MCP servers, handle artifacts, and securely invoke AI workloads. With a decoupled architecture, robust validation, and header-based AWS credential injection, this service ensures future scalability and cloud-agnostic migration readiness.

---

**Next Step:** Implement the following adapters:
- `S3ArtifactAdapter`
- `BedrockDeployAdapter`
- `McpDeployAdapter`
- `BedrockInvokeAdapter`
- `CredentialResolver`

Each adapter should implement the defined interfaces and be injected into service orchestrators for maximum flexibility and testability.

