# Outputs for Agent Builder Terraform deployment

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.postgres.port
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

output "s3_bucket_name" {
  description = "Name of the S3 artifacts bucket"
  value       = aws_s3_bucket.artifacts.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 artifacts bucket"
  value       = aws_s3_bucket.artifacts.arn
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    for service in var.services : service => aws_ecr_repository.services[service].repository_url
  }
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = true
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "service_urls" {
  description = "Service URLs"
  value = {
    frontend        = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
    api             = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}/api" : "http://${aws_lb.main.dns_name}/api"
    aws_services    = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}/aws-api" : "http://${aws_lb.main.dns_name}/aws-api"
    llm_services    = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}/llm-api" : "http://${aws_lb.main.dns_name}/llm-api"
  }
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value = {
    for service in var.services : service => aws_cloudwatch_log_group.services[service].name
  }
}

output "deployment_info" {
  description = "Deployment information"
  value = {
    region      = var.aws_region
    environment = var.environment
    cluster     = aws_ecs_cluster.main.name
    alb_dns     = aws_lb.main.dns_name
    services = {
      for service in var.services : service => {
        repository_url = aws_ecr_repository.services[service].repository_url
        log_group     = aws_cloudwatch_log_group.services[service].name
      }
    }
  }
}

# Instructions for next steps
output "next_steps" {
  description = "Next steps after deployment"
  value = {
    ecr_login_command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    
    build_and_push_commands = {
      for service in var.services : service => [
        "cd agent-builder-${service}",
        "docker build -t ${aws_ecr_repository.services[service].repository_url}:latest .",
        "docker push ${aws_ecr_repository.services[service].repository_url}:latest"
      ]
    }
    
    update_service_commands = {
      for service in var.services : service => "aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${var.project_name}-${service} --force-new-deployment --region ${var.aws_region}"
    }
    
    access_urls = {
      application = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
      api_docs    = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}/api/docs" : "http://${aws_lb.main.dns_name}/api/docs"
    }
  }
}