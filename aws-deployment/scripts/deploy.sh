#!/bin/bash

# Agent Builder AWS Fargate Deployment Script

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
PROJECT_NAME="${PROJECT_NAME:-agent-builder}"

# Services to build and deploy
SERVICES=("ui" "services" "aws-services" "llm-services")

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured. Please run 'aws configure'."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

setup_terraform() {
    log_info "Setting up Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        log_warning "terraform.tfvars not found. Please create it from terraform.tfvars.example"
        log_info "You can copy the example file:"
        echo "  cp terraform.tfvars.example terraform.tfvars"
        echo "  # Edit terraform.tfvars with your values"
        exit 1
    fi
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Validate Terraform configuration
    log_info "Validating Terraform configuration..."
    terraform validate
    
    log_success "Terraform setup complete"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Plan deployment
    log_info "Creating Terraform plan..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    echo -e "\n${YELLOW}Do you want to proceed with the deployment? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
    
    # Apply deployment
    log_info "Applying Terraform configuration..."
    terraform apply tfplan
    
    # Get outputs
    ECR_LOGIN_CMD=$(terraform output -raw ecr_login_command 2>/dev/null || echo "")
    CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
    
    log_success "Infrastructure deployment complete"
    
    # Export variables for later use
    export ECR_LOGIN_CMD
    export CLUSTER_NAME
}

get_ecr_repositories() {
    log_info "Getting ECR repository URLs..."
    
    cd "$TERRAFORM_DIR"
    
    # Get ECR URLs for each service
    for service in "${SERVICES[@]}"; do
        ECR_URL=$(terraform output -json ecr_repository_urls | jq -r ".\"$service\"" 2>/dev/null || echo "")
        if [ -n "$ECR_URL" ]; then
            export "ECR_URL_${service//-/_}=$ECR_URL"
            log_info "ECR URL for $service: $ECR_URL"
        else
            log_error "Could not get ECR URL for $service"
            exit 1
        fi
    done
}

docker_login() {
    log_info "Logging into ECR..."
    
    if [ -n "$ECR_LOGIN_CMD" ]; then
        eval "$ECR_LOGIN_CMD"
        log_success "Successfully logged into ECR"
    else
        log_error "ECR login command not available"
        exit 1
    fi
}

build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    cd "$PROJECT_ROOT"
    
    for service in "${SERVICES[@]}"; do
        log_info "Building and pushing $service..."
        
        # Get ECR URL for this service
        ECR_VAR_NAME="ECR_URL_${service//-/_}"
        ECR_URL="${!ECR_VAR_NAME}"
        
        if [ -z "$ECR_URL" ]; then
            log_error "ECR URL not found for $service"
            exit 1
        fi
        
        # Build and push based on service type
        case "$service" in
            "ui")
                SERVICE_DIR="agent-builder-ui"
                ;;
            "services")
                SERVICE_DIR="agent-builder-services"
                ;;
            "aws-services")
                SERVICE_DIR="agent-builder-aws-services"
                ;;
            "llm-services")
                SERVICE_DIR="agent-builder-llm-services"
                ;;
        esac
        
        if [ ! -d "$SERVICE_DIR" ]; then
            log_error "Service directory $SERVICE_DIR not found"
            exit 1
        fi
        
        cd "$SERVICE_DIR"
        
        # Build image
        log_info "Building Docker image for $service..."
        docker build -t "$ECR_URL:latest" .
        
        # Push image
        log_info "Pushing Docker image for $service..."
        docker push "$ECR_URL:latest"
        
        log_success "Successfully built and pushed $service"
        
        cd "$PROJECT_ROOT"
    done
}

update_ecs_services() {
    log_info "Updating ECS services to use new images..."
    
    for service in "${SERVICES[@]}"; do
        SERVICE_NAME="${PROJECT_NAME}-${service}"
        
        log_info "Updating ECS service: $SERVICE_NAME"
        
        aws ecs update-service \
            --cluster "$CLUSTER_NAME" \
            --service "$SERVICE_NAME" \
            --force-new-deployment \
            --region "$AWS_REGION" > /dev/null
        
        log_success "Updated ECS service: $SERVICE_NAME"
    done
}

wait_for_deployment() {
    log_info "Waiting for deployment to complete..."
    
    for service in "${SERVICES[@]}"; do
        SERVICE_NAME="${PROJECT_NAME}-${service}"
        
        log_info "Waiting for $SERVICE_NAME to be stable..."
        
        aws ecs wait services-stable \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --region "$AWS_REGION"
        
        log_success "$SERVICE_NAME is stable"
    done
}

show_deployment_info() {
    log_info "Deployment completed successfully!"
    
    cd "$TERRAFORM_DIR"
    
    # Get application URL
    ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
    CERTIFICATE_ARN=$(terraform output -raw certificate_arn 2>/dev/null || echo "")
    
    echo -e "\n${GREEN}=== Deployment Information ===${NC}"
    echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
    echo -e "Region: ${YELLOW}$AWS_REGION${NC}"
    echo -e "Cluster: ${YELLOW}$CLUSTER_NAME${NC}"
    
    if [ -n "$ALB_DNS" ]; then
        if [ -n "$CERTIFICATE_ARN" ]; then
            echo -e "Application URL: ${YELLOW}https://$ALB_DNS${NC}"
        else
            echo -e "Application URL: ${YELLOW}http://$ALB_DNS${NC}"
        fi
    fi
    
    echo -e "\n${GREEN}=== Service Status ===${NC}"
    for service in "${SERVICES[@]}"; do
        SERVICE_NAME="${PROJECT_NAME}-${service}"
        echo -e "$service: ${GREEN}Deployed${NC}"
    done
    
    echo -e "\n${GREEN}=== Management Commands ===${NC}"
    echo -e "View logs: ${YELLOW}aws logs tail /ecs/$PROJECT_NAME-<service> --follow --region $AWS_REGION${NC}"
    echo -e "Scale service: ${YELLOW}aws ecs update-service --cluster $CLUSTER_NAME --service $PROJECT_NAME-<service> --desired-count <count> --region $AWS_REGION${NC}"
    echo -e "Destroy infrastructure: ${YELLOW}cd $TERRAFORM_DIR && terraform destroy${NC}"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    cd "$TERRAFORM_DIR"
    rm -f tfplan
}

# Main execution
main() {
    log_info "Starting Agent Builder deployment to AWS Fargate..."
    
    # Trap to cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    setup_terraform
    deploy_infrastructure
    get_ecr_repositories
    docker_login
    build_and_push_images
    update_ecs_services
    wait_for_deployment
    show_deployment_info
    
    log_success "Deployment completed successfully!"
}

# Script options
case "${1:-}" in
    "infra-only")
        log_info "Deploying infrastructure only..."
        check_prerequisites
        setup_terraform
        deploy_infrastructure
        ;;
    "images-only")
        log_info "Building and pushing images only..."
        check_prerequisites
        get_ecr_repositories
        docker_login
        build_and_push_images
        update_ecs_services
        wait_for_deployment
        ;;
    "help")
        echo "Usage: $0 [infra-only|images-only|help]"
        echo ""
        echo "  infra-only    Deploy infrastructure only"
        echo "  images-only   Build and push images only"
        echo "  help          Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION    AWS region (default: us-east-1)"
        echo "  ENVIRONMENT   Environment name (default: dev)"
        echo "  PROJECT_NAME  Project name (default: agent-builder)"
        ;;
    *)
        main
        ;;
esac