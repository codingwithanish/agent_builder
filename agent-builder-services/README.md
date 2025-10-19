# Agent Builder Services

Central backend orchestration layer for the Agent Builder ecosystem, built with Node.js and TypeScript.

## Features

- **Flow Management**: Create, update, deploy, and test agent flows
- **LLM Configuration**: Manage multiple LLM providers and configurations
- **Real-time Updates**: WebSocket support for deployment status
- **Resource Management**: Upload and manage agents and tools
- **Catalog & Marketplace**: Browse and manage agent/tool collections
- **Clean Architecture**: Domain-driven design with clear separation of concerns

## Architecture

The service follows a layered architecture:

- **Presentation Layer**: REST endpoints and WebSocket handlers
- **Application Layer**: Business logic and use cases
- **Domain Layer**: Core entities and business rules
- **Infrastructure Layer**: Database, external services, and adapters

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (recommended)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database (choose one method):

#### Option A: Using Docker Compose (Recommended)
Start PostgreSQL using the parent directory's docker-compose.yml:
```bash
# From the project root directory (parent of agent-builder-services)
docker-compose up postgres -d

# Wait for database to be ready
docker-compose logs -f postgres
```

The database will be automatically created with:
- Database: `agent_builder`
- User: `agent_builder` 
- Password: `agent_builder_password`
- Port: `5432`

#### Option B: Using Docker directly
```bash
# Run PostgreSQL container
docker run --name agent-builder-postgres \
  -e POSTGRES_DB=agent_builder \
  -e POSTGRES_USER=agent_builder \
  -e POSTGRES_PASSWORD=agent_builder_password \
  -p 5432:5432 \
  -d postgres:15-alpine

# Check if container is running
docker ps
```

#### Option C: Cloud Database (AWS RDS, Azure, GCP)
Update your `.env` file with the cloud database connection string:
```env
DB_URL=postgresql://username:password@hostname:port/database_name
```

4. Run database migrations:
```bash
# Using Docker Compose PostgreSQL
docker exec -i $(docker-compose ps -q postgres) psql -U agent_builder -d agent_builder < src/infrastructure/db/migrations/001_init.sql

# Using direct Docker container
docker exec -i agent-builder-postgres psql -U agent_builder -d agent_builder < src/infrastructure/db/migrations/001_init.sql

# Using cloud/local PostgreSQL with psql client
psql -d "postgresql://agent_builder:agent_builder_password@localhost:5432/agent_builder" -f src/infrastructure/db/migrations/001_init.sql
```

5. (Optional) Load dummy data:
```bash
# See "Loading Dummy Data" section below
```

6. Start development server:
```bash
npm run dev
```

The server will start on `http://localhost:4000`

### Build and Production

```bash
# Build
npm run build

# Start production server
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /api/status` - API information and capabilities

### Flow Management
- `GET /flows` - List all flows
- `GET /flows/:id` - Get specific flow
- `POST /flows` - Create new flow
- `PUT /flows/:id` - Update/save flow
- `POST /flows/:id/deploy` - Deploy flow
- `POST /flows/:id/test` - Test flow execution

### LLM Configuration
- `GET /llms` - List LLM configurations
- `POST /llms` - Create LLM configuration
- `POST /llm/test` - Test LLM connection
- `DELETE /llms/:id` - Delete LLM configuration

### Catalog & Marketplace
- `GET /catalog/:type` - List catalog items (agents/tools)
- `GET /market/:type` - Browse marketplace items
- `POST /market/:id/add` - Add marketplace item to catalog

### WebSocket Events

Connect to `ws://localhost:4000/ws/flows/:flowId` for real-time updates:

- `node:status` - Node deployment status updates
- `deployment:complete` - Flow deployment completion
- `node:error` - Deployment errors

## Configuration

Key environment variables:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DB_URL=postgresql://user:pass@localhost:5432/agent_builder

# External Services
LLM_SERVICE_URL=http://localhost:5001
AWS_SERVICE_URL=http://localhost:5002

# Security
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173

# Features
ENABLE_WEBSOCKETS=true
LOG_LEVEL=debug
```

## Loading Dummy Data

The migration script (`001_init.sql`) includes basic sample data. For additional development data:

### Method 1: Extended Sample Data
Create a file `src/infrastructure/db/seeds/sample_data.sql`:

```sql
-- Additional sample flows
INSERT INTO flows (id, name, description, llm_name, nodes, edges, status) VALUES 
('flow-1', 'Customer Support Bot', 'Automated customer support workflow', 'Claude-Primary', 
 '[{"id":"n1","type":"input"},{"id":"n2","type":"agent"},{"id":"n3","type":"output"}]',
 '[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]',
 'deployed'),
('flow-2', 'Data Analysis Pipeline', 'Automated data processing and analysis', 'Claude-Primary',
 '[{"id":"n1","type":"input"},{"id":"n2","type":"tool"},{"id":"n3","type":"agent"},{"id":"n4","type":"output"}]',
 '[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"},{"id":"e3","source":"n3","target":"n4"}]',
 'draft')
ON CONFLICT (id) DO NOTHING;

-- Additional catalog items
INSERT INTO catalog_items (id, kind, name, description, status, version, author, tags) VALUES
('cat-1', 'agent', 'Code Reviewer', 'AI agent for code review and suggestions', 'deployed', '1.0.0', 'dev@company.com', '["code", "review"]'),
('cat-2', 'tool', 'Slack Integration', 'Tool for Slack notifications and messaging', 'deployed', '2.1.0', 'dev@company.com', '["slack", "notifications"]')
ON CONFLICT (id) DO NOTHING;
```

Load the sample data:
```bash
# Using Docker Compose
docker exec -i $(docker-compose ps -q postgres) psql -U agent_builder -d agent_builder < src/infrastructure/db/seeds/sample_data.sql

# Using direct Docker container  
docker exec -i agent-builder-postgres psql -U agent_builder -d agent_builder < src/infrastructure/db/seeds/sample_data.sql

# Using psql client
psql -d "postgresql://agent_builder:agent_builder_password@localhost:5432/agent_builder" -f src/infrastructure/db/seeds/sample_data.sql
```

### Method 2: Using Database Admin Tool
Access the database via Adminer (if using Docker Compose):
1. Start Adminer: `docker-compose --profile dev up adminer -d`
2. Open http://localhost:8080
3. Login with:
   - System: PostgreSQL
   - Server: postgres  
   - Username: agent_builder
   - Password: agent_builder_password
   - Database: agent_builder

### Method 3: API-based Data Loading
Use the service's API endpoints to create data:
```bash
# Create an LLM config
curl -X POST http://localhost:4000/llms \
  -H "Content-Type: application/json" \
  -d '{"name":"GPT-4","model":"openai:gpt-4","apiKey":"dummy-key"}'

# Create a flow
curl -X POST http://localhost:4000/flows \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Flow","description":"A test flow","llmName":"GPT-4","nodes":[],"edges":[]}'
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Database Migrations

To add new migrations:

1. Create a new SQL file in `src/infrastructure/db/migrations/`
2. Follow the naming convention: `002_description.sql`
3. Run manually: `psql -d agent_builder -f src/infrastructure/db/migrations/002_description.sql`

## Integration with UI

The service is designed to work with the Agent Builder UI. Make sure to:

1. Set `VITE_API_BASE_URL=http://localhost:4000` in the UI's environment
2. Ensure CORS is properly configured
3. Database is running and migrated

## External Services

The service integrates with:

- **LLM Services**: For model testing and execution
- **AWS Services**: For flow deployment and infrastructure
- **PostgreSQL**: For data persistence

Mock implementations are provided for development when external services are not available.

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Ensure PostgreSQL container is running: `docker ps`
   - Check DB_URL in .env matches container settings
   - Verify database exists and migrations ran successfully
   - For Docker Compose: `docker-compose logs postgres`

2. **Migration fails**
   - Ensure database container is fully started before running migrations
   - Check PostgreSQL logs: `docker logs agent-builder-postgres`
   - Verify file paths are correct when running migration commands

3. **CORS errors from UI**
   - Check CORS_ORIGIN matches UI URL
   - Ensure UI is running on expected port

4. **WebSocket connection issues**
   - Verify ENABLE_WEBSOCKETS=true
   - Check firewall settings
   - Ensure proper WebSocket client implementation

5. **Docker-related issues**
   - Container won't start: Check `docker-compose logs [service-name]`
   - Port conflicts: Ensure ports 5432, 6379 aren't in use
   - Permission issues: On Linux/Mac, check Docker daemon permissions
   - Database not accessible: Wait longer for PostgreSQL to initialize

6. **Windows-specific issues**
   - Path separators: Use forward slashes in Docker commands
   - Line endings: Ensure SQL files have LF line endings
   - Docker Desktop: Ensure Docker Desktop is running

### Logs

Logs are written to console in development. Check log levels:
- `error`: Critical errors
- `warn`: Warnings
- `info`: General information
- `debug`: Detailed debugging info

## Contributing

1. Follow TypeScript strict mode
2. Use the established architecture patterns
3. Add tests for new features
4. Update documentation as needed
5. Follow existing code style and conventions

## License

MIT License - see LICENSE file for details