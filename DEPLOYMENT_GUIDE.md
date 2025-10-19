# 🚀 Agent Builder Deployment Guide

Complete guide for deploying the Agent Builder platform locally and on AWS.

## 📋 Prerequisites Checklist

### For Local Development
- [ ] Docker and Docker Compose installed
- [ ] Git repository cloned
- [ ] 8GB+ RAM available
- [ ] Ports 3000, 4000, 5001, 5002, 5432, 6379 available

### For AWS Deployment
- [ ] AWS CLI installed and configured
- [ ] Terraform >= 1.0 installed
- [ ] Docker installed
- [ ] jq utility installed
- [ ] AWS account with appropriate permissions

## 🏠 Local Development Deployment

### Step 1: Clone and Setup
```bash
cd agent_builder
cp .env.example .env
```

### Step 2: Configure Environment
Edit `.env` with your preferences:
```env
# For development, you can use defaults
# For real LLM providers, add your API keys:
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
```

### Step 3: Start Services
```bash
./scripts/start-dev.sh
```

### Step 4: Verify Deployment
Check these URLs:
- 🖥️ Frontend: http://localhost:3000
- 🔧 API Health: http://localhost:4000/health
- ☁️ AWS Services: http://localhost:5002/health  
- 🧠 LLM Services: http://localhost:5001/health
- 🗄️ DB Admin: http://localhost:8080

### Step 5: Stop Services
```bash
./scripts/stop-dev.sh
```

## ☁️ AWS Fargate Deployment

### Step 1: Configure AWS
```bash
aws configure
# Set your credentials and region
```

### Step 2: Prepare Terraform Variables
```bash
cd aws-deployment
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
# Required
aws_region = "us-east-1"
db_password = "your-secure-password"
jwt_secret = "your-jwt-secret"

# Optional (for real LLM providers)
openai_api_key = "your-openai-key"
anthropic_api_key = "your-anthropic-key"

# Environment
environment = "dev"  # or "staging", "production"
```

### Step 3: Deploy Infrastructure
```bash
./scripts/deploy.sh
```

This will:
1. ✅ Create VPC, subnets, security groups
2. ✅ Deploy RDS PostgreSQL database
3. ✅ Create ElastiCache Redis cluster
4. ✅ Set up Application Load Balancer
5. ✅ Create ECS Fargate cluster
6. ✅ Build and push Docker images to ECR
7. ✅ Deploy all services
8. ✅ Configure auto-scaling

### Step 4: Verify AWS Deployment
The script will output the application URL:
```
Application URL: http://your-alb-dns-name.region.elb.amazonaws.com
```

### Step 5: Monitor Deployment
```bash
# View service status
aws ecs describe-services --cluster agent-builder-cluster --services agent-builder-ui

# View logs
aws logs tail /ecs/agent-builder-services --follow --region us-east-1
```

### Step 6: Destroy When Done
```bash
./scripts/destroy.sh
```

## 🔧 Configuration Options

### Service Scaling
```bash
# Scale a service manually
aws ecs update-service \
  --cluster agent-builder-cluster \
  --service agent-builder-services \
  --desired-count 3 \
  --region us-east-1
```

### Environment-Specific Configuration

**Development:**
```hcl
desired_count = 1
cpu = 512
memory = 1024
db_instance_class = "db.t3.micro"
```

**Production:**
```hcl
desired_count = 2
cpu = 1024
memory = 2048
db_instance_class = "db.t3.medium"
enable_backup = true
```

## 🔍 Monitoring and Troubleshooting

### Health Checks
```bash
# Local development
curl http://localhost:4000/health
curl http://localhost:5002/health
curl http://localhost:5001/health

# AWS deployment
curl http://your-alb-dns/api/health
curl http://your-alb-dns/aws-api/health
curl http://your-alb-dns/llm-api/health
```

### Viewing Logs

**Local:**
```bash
docker-compose logs -f agent-builder-services
```

**AWS:**
```bash
aws logs tail /ecs/agent-builder-services --follow --region us-east-1
```

### Common Issues

**Port conflicts (Local):**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :4000

# Stop conflicting services
docker-compose down
```

**Database connection issues:**
```bash
# Local
docker-compose exec postgres pg_isready

# AWS
# Check security groups and RDS status in AWS console
```

**Service won't start:**
```bash
# Check service events
docker-compose logs service-name

# For AWS
aws ecs describe-services --cluster agent-builder-cluster --services agent-builder-services
```

## 🚀 Deployment Workflows

### Development Workflow
1. Code changes locally
2. Test with `./scripts/start-dev.sh`
3. Commit and push changes
4. Deploy to staging/production

### Production Updates
1. Update configuration in `terraform.tfvars`
2. Run `./scripts/deploy.sh`
3. Monitor deployment
4. Verify health checks
5. Test application functionality

### Rollback Procedure
```bash
# For AWS deployment
aws ecs update-service \
  --cluster agent-builder-cluster \
  --service agent-builder-services \
  --task-definition previous-task-def-arn \
  --force-new-deployment
```

## 💰 Cost Optimization

### Development
- Use `t3.micro` instances
- Single AZ deployment
- Minimal backup retention

### Production
- Use appropriate instance sizes
- Multi-AZ for high availability
- Set up CloudWatch alarms
- Consider Reserved Instances

### Estimated AWS Costs (Monthly)

**Development Environment:**
- ECS Fargate: ~$20-40
- RDS t3.micro: ~$15-25
- ElastiCache t3.micro: ~$15-20
- Load Balancer: ~$20
- **Total: ~$70-100/month**

**Production Environment:**
- ECS Fargate: ~$100-200
- RDS t3.medium: ~$60-80
- ElastiCache t3.small: ~$30-40
- Load Balancer: ~$20
- **Total: ~$210-340/month**

## 🛡️ Security Best Practices

### Local Development
- Use development credentials only
- Don't commit `.env` files
- Use dummy mode for LLM services when possible

### Production
- Use AWS Secrets Manager for sensitive data
- Enable VPC Flow Logs
- Configure CloudTrail
- Use least-privilege IAM policies
- Enable SSL/TLS with ACM certificates

## 📞 Support and Maintenance

### Regular Maintenance
- Update Docker images regularly
- Monitor CloudWatch alarms
- Review and rotate secrets
- Update Terraform modules

### Backup and Recovery
- RDS automated backups enabled
- S3 versioning for artifacts
- Document recovery procedures
- Test backup restoration

### Performance Monitoring
- CloudWatch Container Insights
- Application performance metrics
- Database performance insights
- Set up alerting thresholds

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Prerequisites installed
- [ ] Configuration files prepared
- [ ] Credentials configured
- [ ] Resource limits understood

### Local Deployment
- [ ] Docker Compose validates
- [ ] All services start successfully
- [ ] Health checks pass
- [ ] Application accessible
- [ ] Basic functionality tested

### AWS Deployment
- [ ] Terraform plan reviewed
- [ ] Infrastructure deployed
- [ ] Images built and pushed
- [ ] Services deployed and healthy
- [ ] Load balancer accessible
- [ ] Application functionality verified
- [ ] Monitoring configured

### Post-Deployment
- [ ] Performance baselines established
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team access configured
- [ ] Backup procedures tested

---

**🎉 Congratulations!** You've successfully deployed the Agent Builder platform!