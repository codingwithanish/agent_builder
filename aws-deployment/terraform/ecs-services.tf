# ECS Services and Task Definitions for Agent Builder

# IAM roles for ECS tasks
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_custom" {
  name = "${var.project_name}-ecs-task-execution-custom"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "ssm:GetParameters",
          "ssm:GetParameter",
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-role"
  }
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${var.project_name}-ecs-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:CreateService",
          "ecs:UpdateService",
          "ecs:DeleteService",
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "ecs:ListTasks",
          "ecs:StopTask"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction",
          "lambda:DeleteFunction",
          "lambda:InvokeFunction"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${var.project_name}-app-secrets"
  
  tags = {
    Name = "${var.project_name}-app-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  
  secret_string = jsonencode({
    DB_PASSWORD      = var.db_password
    JWT_SECRET       = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
    OPENAI_API_KEY   = var.openai_api_key
    ANTHROPIC_API_KEY = var.anthropic_api_key
    AZURE_OPENAI_API_KEY = var.azure_openai_api_key
  })
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Task Definitions
resource "aws_ecs_task_definition" "ui" {
  family                   = "${var.project_name}-ui"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "ui"
      image = "${aws_ecr_repository.services["ui"].repository_url}:latest"
      
      essential = true
      
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["ui"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost/ || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-ui-task-definition"
  }
}

resource "aws_ecs_task_definition" "services" {
  family                   = "${var.project_name}-services"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "services"
      image = "${aws_ecr_repository.services["services"].repository_url}:latest"
      
      essential = true
      
      portMappings = [
        {
          containerPort = 4000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "4000"
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.postgres.endpoint
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.postgres.db_name
        },
        {
          name  = "DB_USER"
          value = aws_db_instance.postgres.username
        },
        {
          name  = "REDIS_HOST"
          value = aws_elasticache_replication_group.redis.primary_endpoint_address
        },
        {
          name  = "REDIS_PORT"
          value = "6379"
        },
        {
          name  = "AWS_SERVICES_URL"
          value = "http://localhost:5002"  # Same task communication
        },
        {
          name  = "LLM_SERVICES_URL"
          value = "http://localhost:5001"  # Same task communication
        }
      ]
      
      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_PASSWORD::"
        },
        {
          name      = "JWT_SECRET"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["services"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"]
        interval = 30
        timeout = 10
        retries = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-services-task-definition"
  }
}

resource "aws_ecs_task_definition" "aws_services" {
  family                   = "${var.project_name}-aws-services"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "aws-services"
      image = "${aws_ecr_repository.services["aws-services"].repository_url}:latest"
      
      essential = true
      
      portMappings = [
        {
          containerPort = 5002
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "5002"
        },
        {
          name  = "DEFAULT_AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_ARTIFACT_BUCKET"
          value = aws_s3_bucket.artifacts.bucket
        },
        {
          name  = "ALLOW_HEADER_CREDS"
          value = "true"
        },
        {
          name  = "WS_ENABLED"
          value = "true"
        },
        {
          name  = "DEPLOY_TARGET"
          value = "ecs"
        },
        {
          name  = "ECS_CLUSTER_NAME"
          value = aws_ecs_cluster.main.name
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["aws-services"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:5002/health || exit 1"]
        interval = 30
        timeout = 10
        retries = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-aws-services-task-definition"
  }
}

resource "aws_ecs_task_definition" "llm_services" {
  family                   = "${var.project_name}-llm-services"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "llm-services"
      image = "${aws_ecr_repository.services["llm-services"].repository_url}:latest"
      
      essential = true
      
      portMappings = [
        {
          containerPort = 5001
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "PORT"
          value = "5001"
        },
        {
          name  = "APP_MODE"
          value = var.openai_api_key != "" || var.anthropic_api_key != "" ? "real" : "dummy"
        },
        {
          name  = "SERVICE_NAME"
          value = "agent-builder-llm-services"
        },
        {
          name  = "LOG_LEVEL"
          value = "INFO"
        },
        {
          name  = "DEFAULT_LLM_PROVIDER"
          value = "openai"
        },
        {
          name  = "BEDROCK_REGION"
          value = var.aws_region
        },
        {
          name  = "AZURE_OPENAI_ENDPOINT"
          value = var.azure_openai_endpoint
        },
        {
          name  = "AZURE_OPENAI_DEPLOYMENT"
          value = var.azure_openai_deployment
        }
      ]
      
      secrets = [
        {
          name      = "OPENAI_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:OPENAI_API_KEY::"
        },
        {
          name      = "ANTHROPIC_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:ANTHROPIC_API_KEY::"
        },
        {
          name      = "AZURE_OPENAI_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:AZURE_OPENAI_API_KEY::"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["llm-services"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:5001/health || exit 1"]
        interval = 30
        timeout = 10
        retries = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-llm-services-task-definition"
  }
}