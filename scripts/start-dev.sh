#!/bin/bash

# Start Agent Builder in development mode

echo "🚀 Starting Agent Builder Platform in Development Mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

# Create necessary directories
mkdir -p uploads logs

# Start the services
echo "🔧 Building and starting services..."
docker-compose --profile dev up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

services=("postgres" "redis" "agent-builder-services" "agent-builder-aws-services" "agent-builder-llm-services" "agent-builder-ui")

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "$service.*healthy"; then
        echo "✅ $service is healthy"
    else
        echo "⚠️  $service might not be ready yet"
    fi
done

echo ""
echo "🎉 Agent Builder Platform is starting up!"
echo ""
echo "📋 Service URLs:"
echo "   🖥️  Frontend (UI):      http://localhost:3000"
echo "   🔧 Main API:           http://localhost:4000"
echo "   ☁️  AWS Services:       http://localhost:5002"
echo "   🧠 LLM Services:       http://localhost:5001"
echo "   🗄️  Database Admin:     http://localhost:8080"
echo "   📊 Metrics:            http://localhost:9090"
echo ""
echo "📝 Logs:"
echo "   📜 View all logs:      docker-compose logs -f"
echo "   🔍 Service logs:       docker-compose logs -f <service-name>"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
echo ""

# Show logs for a few seconds
echo "📜 Recent logs:"
docker-compose logs --tail=10