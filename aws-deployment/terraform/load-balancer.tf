# Application Load Balancer configuration

# Target Groups
resource "aws_lb_target_group" "ui" {
  name     = "${var.project_name}-ui-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = {
    Name = "${var.project_name}-ui-tg"
  }
}

resource "aws_lb_target_group" "services" {
  name     = "${var.project_name}-services-tg"
  port     = 4000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = {
    Name = "${var.project_name}-services-tg"
  }
}

resource "aws_lb_target_group" "aws_services" {
  name     = "${var.project_name}-aws-services-tg"
  port     = 5002
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = {
    Name = "${var.project_name}-aws-services-tg"
  }
}

resource "aws_lb_target_group" "llm_services" {
  name     = "${var.project_name}-llm-services-tg"
  port     = 5001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = {
    Name = "${var.project_name}-llm-services-tg"
  }
}

# ALB Listeners
resource "aws_lb_listener" "web" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  # Default action redirects to HTTPS if certificate is provided, otherwise forward to UI
  default_action {
    type = var.certificate_arn != "" ? "redirect" : "forward"
    
    dynamic "redirect" {
      for_each = var.certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    
    dynamic "forward" {
      for_each = var.certificate_arn == "" ? [1] : []
      content {
        target_group {
          arn = aws_lb_target_group.ui.arn
        }
      }
    }
  }
}

# HTTPS Listener (only if certificate is provided)
resource "aws_lb_listener" "web_https" {
  count = var.certificate_arn != "" ? 1 : 0
  
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ui.arn
  }
}

# Listener Rules
resource "aws_lb_listener_rule" "api" {
  listener_arn = var.certificate_arn != "" ? aws_lb_listener.web_https[0].arn : aws_lb_listener.web.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "aws_api" {
  listener_arn = var.certificate_arn != "" ? aws_lb_listener.web_https[0].arn : aws_lb_listener.web.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.aws_services.arn
  }

  condition {
    path_pattern {
      values = ["/aws-api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "llm_api" {
  listener_arn = var.certificate_arn != "" ? aws_lb_listener.web_https[0].arn : aws_lb_listener.web.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.llm_services.arn
  }

  condition {
    path_pattern {
      values = ["/llm-api/*"]
    }
  }
}

# ECS Services
resource "aws_ecs_service" "ui" {
  name            = "${var.project_name}-ui"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ui.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.ui.arn
    container_name   = "ui"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.web]

  tags = {
    Name = "${var.project_name}-ui-service"
  }
}

resource "aws_ecs_service" "services" {
  name            = "${var.project_name}-services"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services.arn
    container_name   = "services"
    container_port   = 4000
  }

  depends_on = [aws_lb_listener.web, aws_db_instance.postgres]

  tags = {
    Name = "${var.project_name}-services-service"
  }
}

resource "aws_ecs_service" "aws_services" {
  name            = "${var.project_name}-aws-services"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.aws_services.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.aws_services.arn
    container_name   = "aws-services"
    container_port   = 5002
  }

  depends_on = [aws_lb_listener.web]

  tags = {
    Name = "${var.project_name}-aws-services-service"
  }
}

resource "aws_ecs_service" "llm_services" {
  name            = "${var.project_name}-llm-services"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.llm_services.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.llm_services.arn
    container_name   = "llm-services"
    container_port   = 5001
  }

  depends_on = [aws_lb_listener.web]

  tags = {
    Name = "${var.project_name}-llm-services-service"
  }
}

# Auto Scaling (optional)
resource "aws_appautoscaling_target" "ecs_target" {
  for_each = var.enable_auto_scaling ? toset(var.services) : toset([])

  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${var.project_name}-${each.key}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [
    aws_ecs_service.ui,
    aws_ecs_service.services,
    aws_ecs_service.aws_services,
    aws_ecs_service.llm_services
  ]
}

resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  for_each = var.enable_auto_scaling ? toset(var.services) : toset([])

  name               = "${var.project_name}-${each.key}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = var.target_cpu_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}