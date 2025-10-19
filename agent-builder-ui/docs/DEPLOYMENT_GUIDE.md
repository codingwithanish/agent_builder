# 🚀 Deployment Guide

This guide covers various deployment scenarios for the Agent Builder UI application.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Platforms](#cloud-platforms)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Monitoring & Logging](#monitoring--logging)

## Local Development

### Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd agent-builder-ui
npm install

# Start development server
npm run dev
```

### With Docker

```bash
# Development with hot reload
docker-compose --profile dev up

# Production build testing
docker-compose up
```

## Docker Deployment

### Single Container

```bash
# Build
docker build -t agent-builder-ui .

# Run
docker run -d \
  --name agent-builder-ui \
  -p 3000:80 \
  --restart unless-stopped \
  agent-builder-ui
```

### Multi-Container with Reverse Proxy

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  agent-builder-ui:
    image: agent-builder-ui:latest
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - agent-builder-ui
    restart: unless-stopped
```

## Cloud Platforms

### AWS

#### ECS Fargate

```json
{
  "family": "agent-builder-ui",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "agent-builder-ui",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/agent-builder-ui:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/agent-builder-ui",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### CloudFormation Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Agent Builder UI ECS Service'

Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: agent-builder-cluster

  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: agent-builder-ui
      Cpu: 256
      Memory: 512
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ExecutionRoleArn: !Ref ExecutionRole
      ContainerDefinitions:
        - Name: agent-builder-ui
          Image: !Ref ImageURI
          PortMappings:
            - ContainerPort: 80
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: ecs

  Service:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 2
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          SecurityGroups:
            - !Ref SecurityGroup
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2

Parameters:
  ImageURI:
    Type: String
    Description: ECR Image URI
```

### Google Cloud Platform

#### Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/agent-builder-ui

# Deploy with configuration
gcloud run deploy agent-builder-ui \
  --image gcr.io/PROJECT-ID/agent-builder-ui \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --port 80
```

#### GKE Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-builder-ui
  labels:
    app: agent-builder-ui
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
        image: gcr.io/PROJECT-ID/agent-builder-ui:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: agent-builder-ui-service
spec:
  selector:
    app: agent-builder-ui
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

### Azure

#### Container Instances

```bash
# Create resource group
az group create --name agent-builder-rg --location eastus

# Deploy container
az container create \
  --resource-group agent-builder-rg \
  --name agent-builder-ui \
  --image myregistry.azurecr.io/agent-builder-ui:latest \
  --cpu 1 \
  --memory 1 \
  --registry-login-server myregistry.azurecr.io \
  --registry-username myregistry \
  --registry-password <password> \
  --dns-name-label agent-builder-ui \
  --ports 80
```

#### Azure Container Apps

```yaml
# container-app.yaml
apiVersion: 2022-03-01
location: East US
name: agent-builder-ui
properties:
  managedEnvironmentId: /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.App/managedEnvironments/{env}
  configuration:
    ingress:
      external: true
      targetPort: 80
      allowInsecure: false
      traffic:
        - weight: 100
          latestRevision: true
  template:
    containers:
      - image: myregistry.azurecr.io/agent-builder-ui:latest
        name: agent-builder-ui
        resources:
          cpu: 0.5
          memory: 1.0Gi
    scale:
      minReplicas: 1
      maxReplicas: 10
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm run test

    - name: Build application
      run: npm run build

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Deploy to production
      run: |
        echo "Deploy to your cloud provider"
        # Add deployment commands here
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:18-alpine
  script:
    - npm ci
    - npm run test
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - echo "Deploy to production"
    # Add deployment commands
  only:
    - main
```

## Monitoring & Logging

### Health Checks

The application includes health check endpoints:

```bash
# Container health check
curl http://localhost:3000/health

# Expected response
HTTP/1.1 200 OK
Content-Type: text/plain

healthy
```

### Prometheus Metrics

Add metrics collection to nginx.conf:

```nginx
server {
    # ... existing configuration

    location /metrics {
        stub_status on;
        access_log off;
        allow 10.0.0.0/8;
        deny all;
    }
}
```

### Logging Configuration

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  agent-builder-ui:
    image: agent-builder-ui:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "production"

  fluentd:
    image: fluent/fluentd:latest
    volumes:
      - ./fluentd.conf:/fluentd/etc/fluent.conf
    depends_on:
      - agent-builder-ui
```

### Environment-Specific Configurations

#### Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  agent-builder-ui:
    image: agent-builder-ui:latest
    restart: always
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Staging

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  agent-builder-ui:
    image: agent-builder-ui:staging
    restart: unless-stopped
    environment:
      - NODE_ENV=staging
      - API_BASE_URL=https://api-staging.agentbuilder.com
```

## Security Best Practices

### Nginx Security Headers

```nginx
# Add to nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';" always;
```

### Docker Security

```dockerfile
# Use non-root user
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Scan for vulnerabilities
RUN npm audit --audit-level high
```

### Environment Variables

```bash
# Use secrets management
docker run -d \
  --name agent-builder-ui \
  -p 3000:80 \
  --env-file .env.production \
  agent-builder-ui
```

## Troubleshooting

### Common Issues

1. **Build failures**
   ```bash
   # Clear cache and rebuild
   docker system prune -a
   docker build --no-cache -t agent-builder-ui .
   ```

2. **Memory issues**
   ```yaml
   # Increase memory limits
   services:
     agent-builder-ui:
       deploy:
         resources:
           limits:
             memory: 1G
   ```

3. **Network connectivity**
   ```bash
   # Check container networking
   docker network ls
   docker network inspect bridge
   ```

### Debugging

```bash
# Container logs
docker logs agent-builder-ui -f

# Execute into container
docker exec -it agent-builder-ui sh

# Check health status
docker inspect --format='{{.State.Health.Status}}' agent-builder-ui
```

## Performance Optimization

### Image Optimization

```dockerfile
# Multi-stage build optimization
FROM node:18-alpine as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine as builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### Caching Strategy

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
}
```

---

This deployment guide covers the most common scenarios. For specific requirements, refer to your cloud provider's documentation or contact the development team.