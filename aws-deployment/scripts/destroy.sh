#!/bin/bash

# Agent Builder AWS Infrastructure Destruction Script

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

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
    
    # Check if Terraform directory exists
    if [ ! -d "$TERRAFORM_DIR" ]; then
        log_error "Terraform directory not found: $TERRAFORM_DIR"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

show_resources_to_destroy() {
    log_info "Showing resources that will be destroyed..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if state file exists
    if [ ! -f "terraform.tfstate" ]; then
        log_warning "No Terraform state file found. Nothing to destroy."
        exit 0
    fi
    
    # Show destroy plan
    terraform plan -destroy
}

confirm_destruction() {
    echo -e "\n${RED}⚠️  WARNING: This will permanently destroy all Agent Builder infrastructure! ⚠️${NC}"
    echo -e "${RED}This includes:${NC}"
    echo -e "  • ECS Cluster and Services"
    echo -e "  • RDS Database (including all data)"
    echo -e "  • ElastiCache Redis cluster"
    echo -e "  • S3 bucket (if empty)"
    echo -e "  • Load Balancer and networking"
    echo -e "  • ECR repositories and images"
    echo -e "  • CloudWatch logs"
    echo -e "  • All associated resources"
    
    echo -e "\n${YELLOW}Environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Region: $AWS_REGION${NC}"
    
    echo -e "\n${RED}Are you absolutely sure you want to proceed? (type 'yes' to confirm)${NC}"
    read -r response
    
    if [ "$response" != "yes" ]; then
        log_info "Destruction cancelled"
        exit 0
    fi
    
    echo -e "\n${RED}Last chance! Type 'destroy' to confirm destruction:${NC}"
    read -r final_response
    
    if [ "$final_response" != "destroy" ]; then
        log_info "Destruction cancelled"
        exit 0
    fi
}

scale_down_services() {
    log_info "Scaling down ECS services to 0..."
    
    cd "$TERRAFORM_DIR"
    
    # Get cluster name from Terraform output
    CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
    
    if [ -n "$CLUSTER_NAME" ]; then
        # List of services to scale down
        SERVICES=("agent-builder-ui" "agent-builder-services" "agent-builder-aws-services" "agent-builder-llm-services")
        
        for service in "${SERVICES[@]}"; do
            log_info "Scaling down $service..."
            aws ecs update-service \
                --cluster "$CLUSTER_NAME" \
                --service "$service" \
                --desired-count 0 \
                --region "$AWS_REGION" > /dev/null 2>&1 || true
        done
        
        log_info "Waiting for services to scale down..."
        sleep 30
    else
        log_warning "Could not determine cluster name, skipping service scale down"
    fi
}

empty_s3_bucket() {
    log_info "Emptying S3 bucket..."
    
    cd "$TERRAFORM_DIR"
    
    # Get S3 bucket name from Terraform output
    BUCKET_NAME=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
    
    if [ -n "$BUCKET_NAME" ]; then
        log_info "Emptying S3 bucket: $BUCKET_NAME"
        
        # Delete all object versions
        aws s3api list-object-versions \
            --bucket "$BUCKET_NAME" \
            --query 'Versions[].{Key:Key,VersionId:VersionId}' \
            --output text | while read -r key version_id; do
            if [ -n "$key" ] && [ -n "$version_id" ]; then
                aws s3api delete-object \
                    --bucket "$BUCKET_NAME" \
                    --key "$key" \
                    --version-id "$version_id" > /dev/null 2>&1 || true
            fi
        done
        
        # Delete all delete markers
        aws s3api list-object-versions \
            --bucket "$BUCKET_NAME" \
            --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' \
            --output text | while read -r key version_id; do
            if [ -n "$key" ] && [ -n "$version_id" ]; then
                aws s3api delete-object \
                    --bucket "$BUCKET_NAME" \
                    --key "$key" \
                    --version-id "$version_id" > /dev/null 2>&1 || true
            fi
        done
        
        # Delete remaining objects
        aws s3 rm "s3://$BUCKET_NAME" --recursive > /dev/null 2>&1 || true
        
        log_success "S3 bucket emptied"
    else
        log_warning "Could not determine S3 bucket name"
    fi
}

delete_ecr_images() {
    log_info "Deleting ECR images..."
    
    cd "$TERRAFORM_DIR"
    
    # Get ECR repository URLs
    REPOSITORIES=$(terraform output -json ecr_repository_urls 2>/dev/null | jq -r '.[]' || echo "")
    
    if [ -n "$REPOSITORIES" ]; then
        echo "$REPOSITORIES" | while read -r repo_url; do
            if [ -n "$repo_url" ]; then
                # Extract repository name from URL
                REPO_NAME=$(echo "$repo_url" | awk -F'/' '{print $NF}')
                
                log_info "Deleting images from repository: $REPO_NAME"
                
                # List and delete all images
                aws ecr list-images \
                    --repository-name "$REPO_NAME" \
                    --region "$AWS_REGION" \
                    --query 'imageIds[*]' \
                    --output json | jq -c '.[]' | while read -r image_id; do
                    aws ecr batch-delete-image \
                        --repository-name "$REPO_NAME" \
                        --image-ids "$image_id" \
                        --region "$AWS_REGION" > /dev/null 2>&1 || true
                done
            fi
        done
        
        log_success "ECR images deleted"
    else
        log_warning "Could not determine ECR repositories"
    fi
}

destroy_infrastructure() {
    log_info "Destroying infrastructure with Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Run terraform destroy
    terraform destroy -auto-approve
    
    log_success "Infrastructure destruction complete"
}

cleanup_local_files() {
    log_info "Cleaning up local files..."
    
    cd "$TERRAFORM_DIR"
    
    # Remove Terraform state files and plans
    rm -f terraform.tfstate*
    rm -f tfplan
    rm -rf .terraform/
    
    log_success "Local cleanup complete"
}

show_destruction_summary() {
    echo -e "\n${GREEN}=== Destruction Summary ===${NC}"
    echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
    echo -e "Region: ${YELLOW}$AWS_REGION${NC}"
    echo -e "Status: ${GREEN}All resources destroyed${NC}"
    
    echo -e "\n${GREEN}=== What was destroyed ===${NC}"
    echo -e "✓ ECS Cluster and Services"
    echo -e "✓ RDS Database"
    echo -e "✓ ElastiCache Redis"
    echo -e "✓ Application Load Balancer"
    echo -e "✓ VPC and networking"
    echo -e "✓ S3 bucket (emptied)"
    echo -e "✓ ECR repositories"
    echo -e "✓ CloudWatch logs"
    echo -e "✓ IAM roles and policies"
    echo -e "✓ Security groups"
    echo -e "✓ Secrets Manager secrets"
    
    echo -e "\n${YELLOW}Note: Some AWS resources may take a few minutes to fully delete.${NC}"
}

# Main execution
main() {
    log_info "Starting Agent Builder infrastructure destruction..."
    
    check_prerequisites
    show_resources_to_destroy
    confirm_destruction
    scale_down_services
    empty_s3_bucket
    delete_ecr_images
    destroy_infrastructure
    cleanup_local_files
    show_destruction_summary
    
    log_success "Destruction completed successfully!"
}

# Script options
case "${1:-}" in
    "plan")
        log_info "Showing destruction plan..."
        check_prerequisites
        show_resources_to_destroy
        ;;
    "force")
        log_warning "Force mode: skipping confirmations"
        check_prerequisites
        scale_down_services
        empty_s3_bucket
        delete_ecr_images
        destroy_infrastructure
        cleanup_local_files
        show_destruction_summary
        ;;
    "help")
        echo "Usage: $0 [plan|force|help]"
        echo ""
        echo "  plan    Show what would be destroyed (dry run)"
        echo "  force   Destroy without confirmation prompts"
        echo "  help    Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION    AWS region (default: us-east-1)"
        echo "  ENVIRONMENT   Environment name (default: dev)"
        ;;
    *)
        main
        ;;
esac