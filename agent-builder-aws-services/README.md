# Agent Builder AWS Services

AWS integration microservice for the Agent Builder platform, providing comprehensive AWS resource management including S3 artifacts, Bedrock agents, and MCP server deployments.

## Features

- **Artifact Management**: Upload, store, and manage MCP tools, AgentCore packages, and files in S3
- **Bedrock Integration**: Deploy and invoke Bedrock agents with real-time status updates
- **MCP Deployment**: Deploy MCP servers to ECS or Lambda with automated scaling
- **Real-time Updates**: WebSocket support for deployment progress and status notifications
- **Credential Management**: Flexible AWS credential handling via headers or environment
- **Security**: Comprehensive validation, rate limiting, and error handling

## Architecture

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

## Quick Start

### Prerequisites

- Node.js 18+
- AWS Account with appropriate permissions
- S3 bucket for artifact storage
- (Optional) ECS cluster for MCP deployments

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

3. Build the project:
```bash
npm run build
```

4. Start the service:
```bash
npm run dev
```

The service will start on `http://localhost:5002`

## Configuration

Key environment variables:

```env
# Server Configuration
PORT=5002
NODE_ENV=development

# AWS Configuration
DEFAULT_AWS_REGION=us-east-1
S3_ARTIFACT_BUCKET=agent-builder-artifacts
ALLOW_HEADER_CREDS=true

# Features
WS_ENABLED=true
DEPLOY_TARGET=ecs

# Security
CORS_ORIGIN=http://localhost:4000
```

## API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /status` - Service configuration and capabilities

### Artifact Management
- `POST /artifacts/upload` - Upload MCP tools, AgentCore packages
- `GET /artifacts/:key` - Get artifact metadata
- `GET /artifacts/:key/download` - Generate signed download URL
- `DELETE /artifacts/:key` - Delete artifact

### Bedrock Integration
- `POST /bedrock/deploy` - Deploy Bedrock agent
- `GET /bedrock/status/:agentId` - Check deployment status
- `POST /bedrock/invoke` - Invoke Bedrock agent
- `POST /bedrock/invoke/stream` - Stream agent responses
- `POST /bedrock/model/invoke` - Invoke Bedrock model directly

### MCP Deployment
- `POST /mcp/deploy` - Deploy MCP server (ECS/Lambda)
- `GET /mcp/status/:serviceName` - Check deployment status
- `PUT /mcp/:serviceName` - Update MCP service
- `DELETE /mcp/:serviceName` - Delete MCP service
- `GET /mcp/:serviceName/logs` - Get service logs

## AWS Credential Handling

The service supports multiple credential sources (in order of precedence):

1. **Request Headers** (if `ALLOW_HEADER_CREDS=true`):
   ```
   x-aws-access-key-id: YOUR_ACCESS_KEY
   x-aws-secret-access-key: YOUR_SECRET_KEY
   x-aws-session-token: YOUR_SESSION_TOKEN (optional)
   x-aws-region: us-east-1 (optional)
   ```

2. **Environment Variables**:
   ```env
   AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
   AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
   AWS_SESSION_TOKEN=YOUR_SESSION_TOKEN (optional)
   ```

3. **AWS SDK Default Chain**: IAM roles, instance profiles, etc.

## WebSocket Events

Connect to `ws://localhost:5002/ws` for real-time updates:

### Deployment Events
```json
{
  "type": "deploy:progress",
  "id": "deployment-id",
  "data": {
    "deploymentId": "deployment-id",
    "step": "creating",
    "progress": 25,
    "message": "Creating Bedrock agent"
  }
}
```

```json
{
  "type": "deploy:complete",
  "id": "deployment-id", 
  "data": {
    "deploymentId": "deployment-id",
    "status": "completed",
    "resourceId": "agent-abc123"
  }
}
```

## Usage Examples

### Upload Artifact
```bash
curl -X POST http://localhost:5002/artifacts/upload \
  -H "x-aws-access-key-id: YOUR_KEY" \
  -H "x-aws-secret-access-key: YOUR_SECRET" \
  -F "file=@mcp-tool.zip" \
  -F "name=My MCP Tool" \
  -F "type=mcp-tool"
```

### Deploy Bedrock Agent
```bash
curl -X POST http://localhost:5002/bedrock/deploy \
  -H "Content-Type: application/json" \
  -H "x-aws-access-key-id: YOUR_KEY" \
  -H "x-aws-secret-access-key: YOUR_SECRET" \
  -d '{
    "agentName": "Customer Support Agent",
    "instruction": "You are a helpful customer support agent.",
    "foundationModel": "anthropic.claude-3-sonnet-20240229-v1:0",
    "agentResourceRoleArn": "arn:aws:iam::123456789012:role/BedrockAgentRole"
  }'
```

### Deploy MCP Server to ECS
```bash
curl -X POST http://localhost:5002/mcp/deploy \
  -H "Content-Type: application/json" \
  -H "x-aws-access-key-id: YOUR_KEY" \
  -H "x-aws-secret-access-key: YOUR_SECRET" \
  -d '{
    "name": "email-mcp-server",
    "image": "my-registry/email-mcp:latest",
    "port": 3000,
    "target": "ecs",
    "environment": {
      "SMTP_HOST": "smtp.gmail.com",
      "SMTP_PORT": "587"
    }
  }'
```

### Invoke Bedrock Agent
```bash
curl -X POST http://localhost:5002/bedrock/invoke \
  -H "Content-Type: application/json" \
  -H "x-aws-access-key-id: YOUR_KEY" \
  -H "x-aws-secret-access-key: YOUR_SECRET" \
  -d '{
    "agentId": "AGENT123",
    "agentAliasId": "ALIAS123", 
    "sessionId": "session-456",
    "inputText": "Help me with my order status"
  }'
```

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run tests
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

## Security Considerations

- **Credential Security**: Never log or store AWS credentials in plain text
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Input Validation**: Comprehensive validation of all inputs
- **CORS**: Configurable CORS settings for cross-origin requests
- **File Upload Security**: Size limits and type validation for uploads

## Monitoring

### Health Checks
- `GET /health` - Basic service health
- WebSocket connection monitoring
- AWS service connectivity validation

### Logging
- Structured JSON logging with Pino
- Request/response logging
- Error tracking and stack traces
- Performance metrics

## AWS Permissions

Required IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject", 
        "s3:DeleteObject",
        "s3:CreateBucket"
      ],
      "Resource": [
        "arn:aws:s3:::agent-builder-artifacts/*",
        "arn:aws:s3:::agent-builder-artifacts"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:CreateAgent",
        "bedrock:UpdateAgent",
        "bedrock:PrepareAgent",
        "bedrock:CreateAgentAlias",
        "bedrock:GetAgent",
        "bedrock:InvokeAgent"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RegisterTaskDefinition",
        "ecs:CreateService",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DeleteService"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:DeleteFunction",
        "lambda:InvokeFunction"
      ],
      "Resource": "*"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Credential Errors**
   - Verify AWS credentials are valid
   - Check IAM permissions
   - Ensure region is supported

2. **Upload Failures**
   - Check file size limits
   - Verify S3 bucket exists and is accessible
   - Confirm content type is supported

3. **Deployment Failures**
   - Validate Bedrock agent role ARN
   - Check ECS cluster configuration
   - Verify Lambda execution role

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging:

```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

1. Follow TypeScript strict mode
2. Use the established architecture patterns
3. Add tests for new features
4. Update documentation as needed

## License

MIT License - see LICENSE file for details