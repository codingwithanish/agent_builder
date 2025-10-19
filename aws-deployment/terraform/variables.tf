# Variables for Agent Builder Terraform configuration

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "agent-builder"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_password" {
  description = "Password for RDS instance"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "services" {
  description = "List of services to deploy"
  type        = list(string)
  default     = ["ui", "services", "aws-services", "llm-services"]
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ARN of SSL certificate (optional)"
  type        = string
  default     = ""
}

variable "desired_count" {
  description = "Desired number of tasks for each service"
  type        = number
  default     = 1
}

variable "cpu" {
  description = "CPU units for Fargate tasks"
  type        = number
  default     = 512
}

variable "memory" {
  description = "Memory for Fargate tasks"
  type        = number
  default     = 1024
}

variable "enable_auto_scaling" {
  description = "Enable auto scaling for ECS services"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks for auto scaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks for auto scaling"
  type        = number
  default     = 10
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "openai_api_key" {
  description = "OpenAI API key for LLM services"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API key for LLM services"
  type        = string
  sensitive   = true
  default     = ""
}

variable "azure_openai_api_key" {
  description = "Azure OpenAI API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "azure_openai_endpoint" {
  description = "Azure OpenAI endpoint"
  type        = string
  default     = ""
}

variable "azure_openai_deployment" {
  description = "Azure OpenAI deployment name"
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "monitoring_enabled" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}