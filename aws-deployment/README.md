# Agent Builder AWS Fargate Deployment

This directory contains all the necessary files to deploy the Agent Builder platform to AWS using Fargate, RDS, and other managed services.

## Architecture Overview

The deployment creates:

- **VPC** with public and private subnets across 2 AZs
- **Application Load Balancer** for traffic routing
- **ECS Fargate Cluster** running containerized services
- **RDS PostgreSQL** database
- **ElastiCache Redis** for caching
- **S3 bucket** for artifact storage
- **ECR repositories** for container images
- **CloudWatch** for logging and monitoring
- **Secrets Manager** for sensitive configuration

## Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform >= 1.0
- Docker
- jq (for JSON processing)

### Required AWS Permissions

Your AWS user/role needs permissions for:
- EC2 (VPC, subnets, security groups, load balancers)
- ECS (clusters, services, task definitions)
- RDS (databases, subnet groups)
- ElastiCache (clusters, subnet groups)
- S3 (buckets, objects)
- ECR (repositories, images)
- IAM (roles, policies)
- CloudWatch (log groups)
- Secrets Manager (secrets)

## Quick Start

1. **Clone and navigate to the deployment directory:**
   ```bash
   cd agent_builder/aws-deployment
   ```

2. **Configure Terraform variables:**
   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

3. **Deploy everything:**
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access your application:**
   The script will output the load balancer URL when complete.

## Configuration

### Environment Variables

Set these before running deployment scripts:

```bash
export AWS_REGION=us-east-1          # AWS region
export ENVIRONMENT=dev               # Environment name
export PROJECT_NAME=agent-builder    # Project name
```

### Terraform Variables

Key variables in `terraform.tfvars`:

```hcl
# Basic configuration
aws_region   = "us-east-1"
environment  = "dev"
project_name = "agent-builder"

# Database
db_password = "your-secure-password"

# LLM API keys (for production)
openai_api_key = "sk-your-openai-key"
anthropic_api_key = "sk-ant-your-anthropic-key"

# Security
jwt_secret = "your-jwt-secret"

# Scaling
desired_count = 1
cpu = 512
memory = 1024
```

## Deployment Options

### Full Deployment
Deploy infrastructure and applications:
```bash
./scripts/deploy.sh
```

### Infrastructure Only
Deploy just the AWS infrastructure:
```bash
./scripts/deploy.sh infra-only
```

### Images Only
Build and push new container images:
```bash
./scripts/deploy.sh images-only
```

## Services

The deployment includes these services:

| Service | Port | Purpose |
|---------|------|---------|
| UI | 80 | React frontend |
| Services | 4000 | Main API backend |
| AWS Services | 5002 | AWS integration layer |
| LLM Services | 5001 | LLM provider abstraction |

### Service URLs

All services are accessible through the load balancer:

- **Frontend:** `http(s)://your-alb-dns/`
- **Main API:** `http(s)://your-alb-dns/api/`
- **AWS API:** `http(s)://your-alb-dns/aws-api/`
- **LLM API:** `http(s)://your-alb-dns/llm-api/`

## Monitoring and Logging

### CloudWatch Logs

Each service has its own log group:
- `/ecs/agent-builder-ui`
- `/ecs/agent-builder-services`
- `/ecs/agent-builder-aws-services`
- `/ecs/agent-builder-llm-services`

View logs:
```bash
aws logs tail /ecs/agent-builder-services --follow --region us-east-1
```

### Metrics

ECS Container Insights is enabled for monitoring:
- CPU and memory utilization
- Network metrics
- Container startup times

## Scaling

### Manual Scaling
```bash
aws ecs update-service \
  --cluster agent-builder-cluster \
  --service agent-builder-services \
  --desired-count 3 \
  --region us-east-1
```

### Auto Scaling

Auto scaling is configured based on CPU utilization:
- Target: 70% CPU
- Min capacity: 1
- Max capacity: 10

## Security

### Network Security
- Services run in private subnets
- Only load balancer has public access
- Security groups restrict traffic between tiers

### Secrets Management
- Database passwords stored in Secrets Manager
- API keys encrypted in Secrets Manager
- No secrets in environment variables

### SSL/TLS
To enable HTTPS:
1. Create an ACM certificate
2. Set `certificate_arn` in terraform.tfvars
3. Redeploy

## Backup and Recovery

### Database Backups
- Automated backups enabled (7 days retention)
- Point-in-time recovery available
- Manual snapshots can be created

### Application State
- Stateless application design
- Configuration in Secrets Manager
- Artifacts stored in S3

## Cost Optimization

### Development Environment
- Use `db.t3.micro` for RDS
- Use `cache.t3.micro` for Redis
- Set `desired_count = 1`
- Enable auto-scaling for traffic-based scaling

### Production Environment
- Use larger instance classes
- Enable Multi-AZ for RDS
- Increase backup retention
- Consider Reserved Instances

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check service events
aws ecs describe-services --cluster agent-builder-cluster --services agent-builder-services

# Check task definition
aws ecs describe-task-definition --task-definition agent-builder-services
```

**Database connection issues:**
```bash
# Check security groups
aws ec2 describe-security-groups --group-names agent-builder-rds-sg

# Test connectivity from ECS task
aws ecs execute-command --cluster agent-builder-cluster --task <task-id> --interactive --command "/bin/bash"
```

**Load balancer 502 errors:**
- Check target group health
- Verify service is running
- Check application logs

### Health Checks

All services include health check endpoints:
- UI: `GET /` (returns 200)
- Services: `GET /health`
- AWS Services: `GET /health`
- LLM Services: `GET /health`

## Updating the Application

### New Image Deployment
1. Build and push new images:
   ```bash
   ./scripts/deploy.sh images-only
   ```

2. ECS will automatically deploy new tasks

### Infrastructure Updates
1. Modify terraform.tfvars
2. Run:
   ```bash
   ./scripts/deploy.sh infra-only
   ```

## Destroying the Environment

⚠️ **Warning:** This permanently deletes all data!

```bash
./scripts/destroy.sh
```

For a dry run:
```bash
./scripts/destroy.sh plan
```

## Support

### Logs and Debugging
```bash
# Service logs
aws logs tail /ecs/agent-builder-services --follow

# ECS service events
aws ecs describe-services --cluster agent-builder-cluster --services agent-builder-services

# Task details
aws ecs list-tasks --cluster agent-builder-cluster --service-name agent-builder-services
aws ecs describe-tasks --cluster agent-builder-cluster --tasks <task-arn>
```

### Performance Monitoring
- CloudWatch Container Insights
- Application Load Balancer metrics
- RDS Performance Insights (if enabled)

## Contributing

When making changes:
1. Test in development environment first
2. Update documentation
3. Test deployment scripts
4. Verify rollback procedures