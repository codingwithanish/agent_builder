#!/bin/bash

# Docker Build Script for Agent Builder UI
# Usage: ./scripts/docker-build.sh [tag]

set -e

# Default values
IMAGE_NAME="agent-builder-ui"
TAG=${1:-"latest"}
REGISTRY=${DOCKER_REGISTRY:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build image
log_info "Building Docker image: ${IMAGE_NAME}:${TAG}"

# Build the image
docker build \
    --tag "${IMAGE_NAME}:${TAG}" \
    --label "version=${TAG}" \
    --label "build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --label "commit=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
    .

if [ $? -eq 0 ]; then
    log_info "✅ Successfully built ${IMAGE_NAME}:${TAG}"
    
    # Show image size
    IMAGE_SIZE=$(docker images --format "table {{.Size}}" ${IMAGE_NAME}:${TAG} | tail -n 1)
    log_info "📦 Image size: ${IMAGE_SIZE}"
    
    # Tag with registry if provided
    if [ ! -z "$REGISTRY" ]; then
        FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"
        docker tag "${IMAGE_NAME}:${TAG}" "${FULL_IMAGE_NAME}"
        log_info "🏷️  Tagged as: ${FULL_IMAGE_NAME}"
    fi
    
    log_info "🚀 To run the container:"
    echo "   docker run -p 3000:80 ${IMAGE_NAME}:${TAG}"
    echo ""
    log_info "🌐 To push to registry:"
    echo "   docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}"
else
    log_error "❌ Failed to build Docker image"
    exit 1
fi