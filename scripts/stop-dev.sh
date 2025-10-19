#!/bin/bash

# Stop Agent Builder development environment

echo "🛑 Stopping Agent Builder Platform..."

# Stop all services
docker-compose --profile dev down

echo "✅ All services stopped."
echo ""
echo "🧹 To clean up (remove volumes):"
echo "   docker-compose down -v"
echo ""
echo "🗑️  To remove images:"
echo "   docker-compose down --rmi all"
echo ""