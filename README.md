# 🚀 Agent Builder Platform

A comprehensive platform for building, deploying, and managing AI agents with support for multiple LLM providers, AWS services integration, and flexible deployment options.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Builder Platform                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)          │  Backend Services              │
│  ├─ Visual Agent Builder   │  ├─ Core API (Node.js)         │
│  ├─ Deployment Dashboard   │  ├─ AWS Services (Node.js)     │
│  ├─ Monitoring UI          │  ├─ LLM Services (Python)      │
│  └─ Real-time Updates      │  └─ WebSocket Events           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                │  External Integrations         │
│  ├─ PostgreSQL             │  ├─ OpenAI                     │
│  ├─ Redis Cache            │  ├─ Anthropic                  │
│  └─ S3 Storage             │  ├─ AWS Bedrock                │
│                            │  └─ Azure OpenAI               │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Services Overview

| Service | Technology | Port | Purpose |
|---------|------------|------|---------|
| **agent-builder-ui** | React + Vite | 3000 | Frontend interface |
| **agent-builder-services** | Node.js + TypeScript | 4000 | Core API backend |
| **agent-builder-aws-services** | Node.js + TypeScript | 5002 | AWS integration |
| **agent-builder-llm-services** | Python + FastAPI | 5001 | LLM providers |
| **postgres** | PostgreSQL 15 | 5432 | Primary database |
| **redis** | Redis 7 | 6379 | Caching & sessions |

## 🚀 Quick Start

### Local Development with Docker Compose

1. **Clone and setup:**
   ```bash
   cd agent_builder
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start all services:**
   ```bash
   ./scripts/start-dev.sh
   ```

3. **Access the application:**
   - 🖥️ **Frontend:** http://localhost:3000
   - 🔧 **API:** http://localhost:4000
   - ☁️ **AWS Services:** http://localhost:5002
   - 🧠 **LLM Services:** http://localhost:5001
   - 🗄️ **Database Admin:** http://localhost:8080

4. **Stop services:**
   ```bash
   ./scripts/stop-dev.sh
   ```

### Production Deployment on AWS Fargate

1. **Configure AWS deployment:**
   ```bash
   cd aws-deployment
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Deploy to AWS:**
   ```bash
   ./scripts/deploy.sh
   ```

3. **Destroy when done:**
   ```bash
   ./scripts/destroy.sh
   ```

## 🔧 Configuration

### Environment Variables

Key configuration options:

```env
# Database
DB_HOST=postgres
DB_NAME=agent_builder
DB_USER=agent_builder
DB_PASSWORD=agent_builder_password

# LLM API Keys (set for production)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
AZURE_OPENAI_API_KEY=your_azure_key

# AWS (for AWS services)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
DEFAULT_AWS_REGION=us-east-1

# Security
JWT_SECRET=your-jwt-secret
```

### Development vs Production

**Development Mode:**
- Uses Docker Compose
- LLM services in "dummy" mode (no API keys needed)
- Local PostgreSQL and Redis
- Hot reloading enabled

**Production Mode:**
- Deployed on AWS Fargate
- Real LLM providers with API keys
- Managed AWS services (RDS, ElastiCache)
- Auto-scaling and load balancing

## 🏗️ Service Details

### 🎨 Frontend (agent-builder-ui)
- **Framework:** React 18 + TypeScript + Vite
- **Features:**
  - Visual agent builder interface
  - Real-time deployment status
  - Monaco editor for code editing
  - Responsive design with Tailwind CSS

### 🔧 Core API (agent-builder-services)
- **Framework:** Node.js + Express + TypeScript
- **Features:**
  - User authentication and authorization
  - Agent configuration management
  - Deployment orchestration
  - WebSocket real-time updates
  - File upload handling

### ☁️ AWS Services (agent-builder-aws-services)
- **Framework:** Node.js + Express + TypeScript
- **Features:**
  - S3 artifact management
  - Bedrock agent deployment
  - ECS/Lambda deployment
  - Real-time deployment progress
  - AWS credential management

### 🧠 LLM Services (agent-builder-llm-services)
- **Framework:** Python + FastAPI + LangChain
- **Features:**
  - Multi-provider LLM integration (OpenAI, Anthropic, Bedrock, Azure)
  - JSON-first responses with validation
  - Server-Sent Events streaming
  - Dummy mode for development
  - Comprehensive error handling

## 🔍 Monitoring and Observability

### Logging
- **Structured logging** with correlation IDs
- **Centralized logs** in development via Docker Compose
- **CloudWatch logs** in AWS deployment

### Metrics
- **Prometheus metrics** from all services
- **Health check endpoints** for monitoring
- **Performance tracking** for LLM operations

### Real-time Updates
- **WebSocket connections** for deployment progress
- **Server-Sent Events** for LLM streaming
- **Real-time status** updates across the platform

## 🔒 Security

### Authentication & Authorization
- **JWT-based authentication**
- **Role-based access control**
- **Session management** with Redis

### API Security
- **Rate limiting** on all endpoints
- **CORS configuration**
- **Input validation** and sanitization
- **Security headers** (Helmet.js)

### Credential Management
- **Environment-based secrets**
- **AWS Secrets Manager** for production
- **Header-based credential passing**
- **Automatic credential redaction** in logs

## 📊 Development Workflow

### Local Development
```bash
# Start development environment
./scripts/start-dev.sh

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart agent-builder-services

# Run tests
docker-compose exec agent-builder-services npm test
```

### Building and Testing
```bash
# Build all services
docker-compose build

# Run linting
docker-compose exec agent-builder-services npm run lint

# Run type checking
docker-compose exec agent-builder-services npm run build
```

### Database Management
```bash
# Access database
docker-compose exec postgres psql -U agent_builder -d agent_builder

# View database admin interface
open http://localhost:8080
```

## 🚀 Deployment

### Local Testing
- Use Docker Compose for full local development
- All services run with hot reloading
- Dummy mode for LLM services (no API keys needed)

### AWS Fargate Production
- Complete infrastructure as code with Terraform
- Auto-scaling ECS services
- Managed database and caching
- Load balancer with SSL termination
- Comprehensive monitoring and logging

### Key Deployment Features
- **Zero-downtime deployments**
- **Health checks** for all services
- **Auto-scaling** based on CPU utilization
- **Blue-green deployments** support
- **Rollback capabilities**

## 🛠️ Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs agent-builder-services

# Restart services
docker-compose restart
```

**Database connection issues:**
```bash
# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready
```

**API not responding:**
```bash
# Check health endpoints
curl http://localhost:4000/health
curl http://localhost:5002/health
curl http://localhost:5001/health
```

### Health Check Endpoints

All services expose health endpoints:
- **UI:** `GET /` (returns HTML)
- **Core API:** `GET /health`
- **AWS Services:** `GET /health`
- **LLM Services:** `GET /health`

## 📖 API Documentation

### Core API Endpoints
- **Authentication:** `/api/auth/*`
- **Agents:** `/api/agents/*`
- **Deployments:** `/api/deployments/*`
- **Users:** `/api/users/*`

### AWS Services API
- **Artifacts:** `/artifacts/*`
- **Bedrock:** `/bedrock/*`
- **MCP Deployment:** `/mcp/*`

### LLM Services API
- **Invoke:** `/v1/llm/invoke-json`
- **Stream:** `/v1/llm/invoke-stream`
- **Test:** `/v1/llm/test`
- **Models:** `/v1/llm/models`

## 🧪 Testing

### Unit Tests
```bash
# Backend services
docker-compose exec agent-builder-services npm test

# LLM services
docker-compose exec agent-builder-llm-services python -m pytest
```

### Integration Tests
```bash
# Full stack testing
docker-compose exec agent-builder-services npm run test:integration
```

### E2E Tests
```bash
# Frontend E2E tests
cd agent-builder-ui
npm run test:e2e
```

## 📝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Set up local development environment
4. Make changes and test locally
5. Submit pull request

### Code Standards
- **TypeScript** for backend services
- **Python** with type hints for LLM services
- **React** with TypeScript for frontend
- **ESLint** and **Prettier** for code formatting
- **Comprehensive testing** required

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

### Documentation
- Service-specific READMEs in each subdirectory
- API documentation available at `/docs` endpoints
- AWS deployment guide in `aws-deployment/README.md`

### Getting Help
- Check service logs for error details
- Use health endpoints to verify service status
- Review configuration in `.env` files
- Ensure all required dependencies are installed

---

**Ready to build amazing AI agents?** 🤖✨

Start with `./scripts/start-dev.sh` and begin building!