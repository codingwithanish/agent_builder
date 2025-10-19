# Agent Builder UI

A modern, interactive web application for building and managing AI agent workflows using a visual flow editor. Built with React, TypeScript, and ReactFlow.

![Agent Builder UI](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue)
![Vite](https://img.shields.io/badge/Vite-4.4.5-purple)
![Docker](https://img.shields.io/badge/Docker-Ready-green)

## ✨ Features

- **Visual Flow Editor**: Drag-and-drop interface for building agent workflows
- **Multiple Node Types**: Agent, Tool, Condition, Human, Input, and Output nodes
- **Real-time Testing**: Test flows with live execution simulation
- **Deployment Management**: Publish flows with real-time status updates
- **Catalogue & Marketplace**: Browse and add agents/tools to your workflows
- **Responsive Design**: Works seamlessly on desktop and tablet devices
- **Dual Mode Operation**: Dummy mode for development, API mode for production

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** 9+
- **Docker** (optional, for containerization)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agent-builder-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |
| `npm run type-check` | Run TypeScript type checking |

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   ```
   http://localhost:3000
   ```

3. **Stop the application**
   ```bash
   docker-compose down
   ```

### Manual Docker Commands

1. **Build the Docker image**
   ```bash
   docker build -t agent-builder-ui .
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:80 agent-builder-ui
   ```

### Development with Docker

For development with hot reload:

```bash
docker-compose --profile dev up
```

This will start the development server at `http://localhost:5173` with volume mounting for live code changes.

## 📦 Building and Publishing Docker Images

### Using the Build Script

We provide a convenient build script for creating and tagging Docker images:

```bash
# Build with default latest tag
./scripts/docker-build.sh

# Build with specific tag
./scripts/docker-build.sh v1.0.0

# Build with registry prefix
DOCKER_REGISTRY=your-registry.com ./scripts/docker-build.sh v1.0.0
```

### Manual Registry Push

1. **Tag your image for the registry**
   ```bash
   docker tag agent-builder-ui:latest your-registry.com/agent-builder-ui:latest
   ```

2. **Push to registry**
   ```bash
   docker push your-registry.com/agent-builder-ui:latest
   ```

### Common Registries

**Docker Hub:**
```bash
# Tag
docker tag agent-builder-ui:latest yourusername/agent-builder-ui:latest

# Push
docker push yourusername/agent-builder-ui:latest
```

**Amazon ECR:**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag agent-builder-ui:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/agent-builder-ui:latest

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/agent-builder-ui:latest
```

**Google Container Registry:**
```bash
# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker

# Tag
docker tag agent-builder-ui:latest gcr.io/your-project-id/agent-builder-ui:latest

# Push
docker push gcr.io/your-project-id/agent-builder-ui:latest
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:4000/api
VITE_MODE=dummy

# Feature Flags
VITE_ENABLE_MARKETPLACE=true
VITE_ENABLE_TESTING=true

# Application Settings
VITE_APP_TITLE=Agent Builder
VITE_MAX_FILE_SIZE=50MB
```

### Environment-Specific Configurations

**Development (.env.development):**
```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_MODE=dummy
VITE_LOG_LEVEL=debug
```

**Production (.env.production):**
```env
VITE_API_BASE_URL=https://api.agentbuilder.com/v1
VITE_MODE=real
VITE_LOG_LEVEL=error
```

## 🏗️ Project Structure

```
agent-builder-ui/
├── src/
│   ├── app/                    # App configuration and providers
│   ├── components/             # Reusable UI components
│   │   ├── common/            # Common components (buttons, modals, etc.)
│   │   ├── drawers/           # Configuration drawers
│   │   ├── header/            # Header components
│   │   ├── sidebar/           # Sidebar components
│   │   └── right-panel/       # Right panel components
│   ├── features/              # Feature-based modules
│   │   ├── flows/             # Flow management
│   │   ├── catalogue/         # Agent/Tool catalogue
│   │   └── resources/         # Resource management
│   ├── lib/                   # Utilities and types
│   ├── services/              # API services
│   ├── state/                 # State management (Zustand stores)
│   └── styles/                # Global styles
├── public/                    # Static assets
├── docker/                    # Docker-related files
├── scripts/                   # Build and deployment scripts
└── docs/                      # Documentation
```

## 🎯 Key Components

### Flow Editor
- **FlowCanvas**: Main ReactFlow canvas with drag-and-drop functionality
- **Node Types**: Specialized components for each node type (Agent, Tool, etc.)
- **Configuration Drawers**: Side panels for configuring node properties

### State Management
- **flowStore**: Manages flow data and operations
- **panelStore**: Controls UI panel states
- **marketStore**: Handles catalogue and marketplace data
- **toastStore**: Manages notification toasts

### API Integration
- **ApiClient**: Abstract interface for API operations
- **DummyApiClient**: Local storage implementation for development
- **RealApiClient**: HTTP client for production API calls

## 🔌 API Integration

The application supports two modes:

### Dummy Mode (Development)
- Uses localStorage for data persistence
- Simulates API responses with realistic delays
- Perfect for development and testing

### Real Mode (Production)
- Connects to actual backend API
- Requires API_BASE_URL configuration
- See `API_DOCUMENTATION.md` for complete API specification

## 🧪 Testing

### Running Tests
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Manual Testing Checklist

- [ ] Create new flow
- [ ] Drag nodes from catalogue to canvas
- [ ] Connect nodes with edges
- [ ] Configure node properties
- [ ] Test edge reconnection
- [ ] Insert nodes between connections
- [ ] Publish flow and verify status updates
- [ ] Test flow execution
- [ ] Verify responsive design

## 🚀 Deployment

### Production Build

1. **Create production build**
   ```bash
   npm run build
   ```

2. **Serve with nginx/apache**
   ```bash
   # Copy dist/ contents to your web server
   cp -r dist/* /var/www/html/
   ```

### Docker Deployment

1. **Build production image**
   ```bash
   docker build -t agent-builder-ui:latest .
   ```

2. **Deploy to container orchestration**
   ```yaml
   # kubernetes deployment example
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: agent-builder-ui
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: agent-builder-ui
     template:
       metadata:
         labels:
           app: agent-builder-ui
       spec:
         containers:
         - name: agent-builder-ui
           image: agent-builder-ui:latest
           ports:
           - containerPort: 80
           env:
           - name: API_BASE_URL
             value: "https://api.agentbuilder.com/v1"
   ```

### Cloud Deployment

**AWS ECS:**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker build -t agent-builder-ui .
docker tag agent-builder-ui:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/agent-builder-ui:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/agent-builder-ui:latest
```

**Google Cloud Run:**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/agent-builder-ui
gcloud run deploy --image gcr.io/PROJECT-ID/agent-builder-ui --platform managed
```

**Azure Container Instances:**
```bash
# Build and push to ACR
az acr build --registry myregistry --image agent-builder-ui .
az container create --resource-group myResourceGroup --name agent-builder-ui --image myregistry.azurecr.io/agent-builder-ui:latest
```

## 🔒 Security Considerations

### Content Security Policy
The nginx configuration includes security headers:
```nginx
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### Environment Variables
- Never commit sensitive environment variables
- Use secrets management in production
- Validate and sanitize all inputs

### Docker Security
- Use non-root user in containers
- Scan images for vulnerabilities
- Keep base images updated

## 🐛 Troubleshooting

### Common Issues

**Development server won't start:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Docker build fails:**
```bash
# Clear Docker cache
docker system prune -a
```

**TypeScript errors:**
```bash
# Check TypeScript configuration
npx tsc --noEmit
```

**Hot reload not working:**
```bash
# Check if using correct host
npm run dev -- --host 0.0.0.0
```

### Performance Issues

**Large bundle size:**
- Check for unused dependencies
- Use dynamic imports for code splitting
- Optimize images and assets

**Slow Docker builds:**
- Use multi-stage builds
- Optimize layer caching
- Use .dockerignore effectively

## 📚 Additional Resources

- [ReactFlow Documentation](https://reactflow.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [API Documentation](./API_DOCUMENTATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:

- 📧 Email: support@agentbuilder.com
- 💬 Discussions: GitHub Discussions
- 🐛 Issues: GitHub Issues
- 📖 Documentation: [docs/](./docs/)

---

**Happy Building! 🎉**