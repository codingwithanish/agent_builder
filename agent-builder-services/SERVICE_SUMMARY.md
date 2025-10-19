# 🧱 AGENT-BUILDER-SERVICES

## 📘 Overview

**Service Name:** `agent-builder-services`  
**Language:** Node.js + TypeScript  
**API Type:** REST + WebSocket  
**Database:** PostgreSQL (pluggable for future DBs)  

The **Agent Builder Services** is the **central backend orchestration layer** in the Agent Builder ecosystem.  
It connects the **Agent Builder UI** with other microservices like:

- `agent-builder-llm-services` → for LLM management, testing, and execution  
- `agent-builder-aws-services` → for deployments, provisioning, and cloud resource operations  

This service manages:
- Flow saving/loading and configuration persistence
- Real-time deployment and test status updates
- Orchestration between internal and external systems
- Adaptability for future infrastructure changes (e.g., DB or cloud migration)

---

## 🎯 Core Responsibilities

| Area | Description |
|------|--------------|
| **Persistence** | Save, update, and fetch agent flows, nodes, edges, configurations, and deployments. |
| **Integration** | Communicate with external services such as AWS and LLM via adapters. |
| **Eventing** | Stream deployment or test results to the UI using WebSocket. |
| **Orchestration** | Coordinate interactions between LLM, AWS, and DB layers for a complete flow lifecycle. |
| **Configuration** | Centralized environment variable management with validation. |
| **Resilience** | Built-in retry and error handling for external services. |
| **Observability** | Unified structured logging, tracing, and metrics collection. |

---

## 🧭 High-Level Architecture

```
                   ┌──────────────────────────────┐
                   │     Agent Builder UI (FE)    │
                   └──────────────┬───────────────┘
                                  │ REST / WS
                                  ▼
         ┌───────────────────────────────────────────────┐
         │              agent-builder-services            │
         │───────────────────────────────────────────────│
         │  Presentation Layer (Controllers / WS)        │
         │  Application Layer (Use Cases / Services)     │
         │  Domain Layer (Entities / Interfaces)         │
         │  Infrastructure Layer (Adapters / DB / Log)   │
         └───────────────────────────────────────────────┘
                     ▲                   ▲
         ┌───────────┴───────┐   ┌───────┴──────────┐
         │ agent-builder-    │   │ agent-builder-   │
         │ llm-services      │   │ aws-services     │
         └───────────────────┘   └──────────────────┘
                     │
                 PostgreSQL
```

---

## ⚙️ Layer Responsibilities

### 1️⃣ Presentation Layer
- Handles **REST endpoints** and **WebSocket** connections.  
- No business logic — routes delegate to service classes.  
- Example:  
  ```
  POST /flows
   └─> FlowController.createFlow()
        └─> FlowService.createFlow()
  ```
- WebSocket events: deployment progress, node status, test results.

---

### 2️⃣ Application Layer
- Core orchestration logic for flows, LLM, and AWS interactions.  
- Each use case (create, deploy, test, etc.) has its own service.  
- Example classes:
  - `FlowService`
  - `DeploymentService`
  - `LLMIntegrationService`
- Uses **Dependency Injection** to remain framework-agnostic and testable.

---

### 3️⃣ Domain Layer
- Contains core **entities**, **interfaces**, and **enums**.  
- Free of any external dependencies.  

#### Example Entities and Interfaces

```ts
export interface Flow {
  id: string;
  name: string;
  description?: string;
  llmId: string;
  graph: any; // ReactFlow-compatible structure
  status: 'draft' | 'deploying' | 'deployed' | 'failed';
}

export interface FlowRepository {
  create(flow: Flow): Promise<Flow>;
  update(id: string, data: Partial<Flow>): Promise<void>;
  findById(id: string): Promise<Flow | null>;
}

export interface LLMClient {
  testConnection(apiKey: string, model: string): Promise<boolean>;
  executePrompt(prompt: string, context: object): Promise<string>;
}

export interface DeploymentClient {
  deployFlow(flow: Flow): Promise<void>;
  getDeploymentStatus(id: string): Promise<string>;
}
```

---

### 4️⃣ Infrastructure Layer
Implements real-world adapters and database clients.  

Includes:
- `PostgresFlowRepository`
- `AWSServiceAdapter`
- `LLMServiceAdapter`
- `WebSocketDispatcher`
- `Logger`
- `ConfigLoader`

#### Example Repository
```ts
export class PostgresFlowRepository implements FlowRepository {
  constructor(private db: Pool) {}

  async create(flow: Flow) {
    const result = await this.db.query(
      'INSERT INTO flows (id, name, description, graph, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [flow.id, flow.name, flow.description, flow.graph, flow.status]
    );
    return result.rows[0];
  }

  async findById(id: string) {
    const result = await this.db.query('SELECT * FROM flows WHERE id = $1', [id]);
    return result.rows[0];
  }
}
```

#### Example Adapter
```ts
export class AWSServiceAdapter implements DeploymentClient {
  constructor(private http: HttpClient) {}

  async deployFlow(flow: Flow) {
    await this.http.post(`${process.env.AWS_SERVICE_URL}/deploy`, { flow });
  }

  async getDeploymentStatus(id: string) {
    const res = await this.http.get(`${process.env.AWS_SERVICE_URL}/status/${id}`);
    return res.data.status;
  }
}
```

---

## 🧠 Design Patterns Used

| Pattern | Purpose |
|----------|----------|
| **Repository Pattern** | Abstracts DB logic for easy DB replacement. |
| **Adapter Pattern** | Wraps LLM/AWS calls; switchable without touching logic. |
| **Dependency Injection** | Promotes modularity and testability. |
| **Factory Pattern** | Dynamically load adapters or repos based on config. |
| **Observer / Pub-Sub** | For WebSocket event notifications. |
| **Decorator Pattern** | Adds logging, retries, or caching to external calls. |

---

## 📁 Folder Structure

```
agent-builder-services/
├── src/
│   ├── app/
│   │   ├── index.ts                # main entrypoint
│   │   ├── server.ts               # Express setup
│   │   ├── websocket.ts            # WebSocket gateway
│   ├── config/
│   │   ├── config.ts               # environment loader
│   │   └── envSchema.ts            # zod schema validation
│   ├── domain/
│   │   ├── entities/               # Flow, Node, etc.
│   │   ├── interfaces/             # Repositories, Adapters
│   │   └── types/                  # DTOs, enums
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── postgresClient.ts
│   │   │   └── repositories/
│   │   │       └── flowRepository.postgres.ts
│   │   ├── adapters/
│   │   │   ├── llmServiceAdapter.ts
│   │   │   └── awsServiceAdapter.ts
│   │   ├── events/
│   │   │   └── websocketDispatcher.ts
│   │   └── logger.ts
│   ├── application/
│   │   ├── services/
│   │   │   ├── flowService.ts
│   │   │   ├── deploymentService.ts
│   │   │   └── llmIntegrationService.ts
│   │   └── orchestrator.ts
│   └── presentation/
│       ├── controllers/
│       │   ├── flowController.ts
│       │   ├── deploymentController.ts
│       │   └── llmController.ts
│       └── routes/
│           └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
└── tsconfig.json
```

---

## 🌍 Environment Configuration

All external services and configurations should be loaded through a validated `ConfigLoader`.

| Variable | Example | Description |
|-----------|----------|-------------|
| `PORT` | `4000` | Service port |
| `DB_TYPE` | `postgres` | Database type |
| `DB_URL` | `postgres://user:pass@localhost:5432/agentbuilder` | Database connection |
| `LLM_SERVICE_URL` | `http://agent-builder-llm:5001` | LLM microservice endpoint |
| `AWS_SERVICE_URL` | `http://agent-builder-aws:5002` | AWS microservice endpoint |
| `ENABLE_WEBSOCKETS` | `true` | Enables WS updates |
| `LOG_LEVEL` | `debug` | Logging verbosity |
| `SERVICE_NAME` | `agent-builder-services` | Service name identifier |

**Example Loader:**
```ts
export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  dbUrl: process.env.DB_URL!,
  llmServiceUrl: process.env.LLM_SERVICE_URL!,
  awsServiceUrl: process.env.AWS_SERVICE_URL!,
};
```

---

## ⚡ WebSocket Events

| Event | Trigger | Payload Example |
|--------|----------|----------------|
| `flow:status:update` | Node deployment progress | `{ flowId, nodeId, status }` |
| `flow:deploy:complete` | Flow fully deployed | `{ flowId, status: 'deployed' }` |
| `flow:test:result` | LLM test completed | `{ flowId, output }` |

Each event follows:
```json
{
  "event": "flow:status:update",
  "timestamp": "2025-10-18T09:00:00Z",
  "data": { "flowId": "abc123", "nodeId": "A1", "status": "deployed" }
}
```

---

## 🧠 Developer Guidelines

### ✅ Before Coding
- Keep logic framework-agnostic (Express/Fastify both fine).
- Use TypeScript strict mode (`"strict": true`).
- Implement **dependency injection** for all adapters and repositories.
- Avoid direct `process.env` calls outside the config loader.
- Use `try/catch` with custom `AppError` class for all async operations.
- Keep WebSocket logic isolated from core business logic.

### ✅ Testing
- Use **Jest + Supertest** for unit/integration tests.
- Mock external adapters (AWS/LLM).
- Use dockerized Postgres for integration testing.

### ✅ Observability
- Structured JSON logs via **Winston** or **Pino**.
- Include `requestId` in all logs.
- Expose `/health` and `/metrics` endpoints.

---

## 🧩 Future-Proofing

- Replace PostgreSQL → MongoDB by adding `MongoFlowRepository`.
- Replace AWS → GCP by adding `GCPServiceAdapter`.
- Add new external service simply by implementing its adapter interface.
- All orchestration logic remains unchanged.

---

## ✅ Developer Checklist

- [ ] ConfigLoader with schema validation implemented  
- [ ] Repository interfaces defined and implemented  
- [ ] Adapter interfaces implemented for LLM & AWS  
- [ ] WebSocket dispatcher created  
- [ ] Centralized error handling middleware  
- [ ] Structured logging setup  
- [ ] Unit and integration tests written  
- [ ] Docker Compose for local setup  
- [ ] Endpoints connected to `agent-builder-ui` verified  

---

## 🧩 Summary

The `agent-builder-services` layer acts as the **brain** of the Agent Builder ecosystem.  
It centralizes orchestration, ensures modular and extensible design, and supports smooth future upgrades — whether for new databases, new LLM providers, or new cloud infrastructures.

```
🚀 Build Once — Adapt Forever.
```
