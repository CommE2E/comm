locals {
  tunnelbroker_config = {
    docker_image = "commapp/tunnelbroker"
    docker_tag   = local.is_staging ? "0.19.12" : "0.19.11"

    grpc_port      = 50051
    websocket_port = 51001
    container_name = "tunnelbroker-server"
    domain_name    = "tunnelbroker.${local.root_domain}"

    local_dns_name = "tunnelbroker"
    grpc_port_name = "tunnelbroker_grpc"
  }

  # Used for other services to connect to Tunnelbroker gRPC endpoint
  tunnelbroker_local_grpc_url = "http://${local.tunnelbroker_config.local_dns_name}:${local.tunnelbroker_config.grpc_port}"

  # Fargate-specific URL for Fargate services to communicate with Fargate tunnelbroker
  tunnelbroker_fargate_grpc_url = "http://${local.tunnelbroker_config.local_dns_name}-fargate:${local.tunnelbroker_config.grpc_port}"

  # utility locals
  tunnelbroker_docker_image = "${local.tunnelbroker_config.docker_image}:${local.tunnelbroker_config.docker_tag}"
  rabbitmq_password         = local.secrets.amqpPassword[local.environment]

  apns_config_secret_name     = "tunnelbroker/APNsConfig"
  fcm_config_secret_name      = "tunnelbroker/FCMConfig"
  web_push_config_secret_name = "tunnelbroker/WebPushConfig"
  wns_config_secret_name      = "tunnelbroker/WNSConfig"
}

data "aws_secretsmanager_secret" "tunnelbroker_apns" {
  name = local.apns_config_secret_name
}

data "aws_secretsmanager_secret" "tunnelbroker_fcm" {
  name = local.fcm_config_secret_name
}

data "aws_secretsmanager_secret" "tunnelbroker_web_push" {
  name = local.web_push_config_secret_name
}

data "aws_secretsmanager_secret" "tunnelbroker_wns" {
  name = local.wns_config_secret_name
}

# RabbitMQ
resource "aws_mq_broker" "tunnelbroker_rabbitmq" {
  broker_name = "tunnelbroker-rabbitmq"

  # Keep RabbitMQ version in sync with docker-compose.yml
  engine_type                = "RabbitMQ"
  engine_version             = "3.13.7"
  auto_minor_version_upgrade = true
  host_instance_type         = local.is_staging ? "mq.t3.micro" : "mq.m5.large"
  apply_immediately          = local.is_staging
  deployment_mode            = "SINGLE_INSTANCE"
  # Access from outside VPC - this allows to access the RabbitMQ console from browser
  publicly_accessible = true

  user {
    username = "comm"
    password = local.rabbitmq_password
  }
}
locals {
  amqp_endpoint = aws_mq_broker.tunnelbroker_rabbitmq.instances[0].endpoints[0]
}



# Security group to configure access to the service
resource "aws_security_group" "tunnelbroker" {
  name   = "tunnelbroker-sg"
  vpc_id = aws_vpc.default.id

  # Websocket
  ingress {
    from_port   = local.tunnelbroker_config.websocket_port
    to_port     = local.tunnelbroker_config.websocket_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Websocket port"
  }

  # gRPC
  ingress {
    from_port   = local.tunnelbroker_config.grpc_port
    to_port     = local.tunnelbroker_config.grpc_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "gRPC port"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}



# Load Balancer
resource "aws_lb" "tunnelbroker" {
  load_balancer_type = "application"
  name               = "tunnelbroker-lb"
  internal           = false
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "tunnelbroker_ws" {
  load_balancer_arn = aws_lb.tunnelbroker.arn
  port              = local.tunnelbroker_config.websocket_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.tunnelbroker.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tunnelbroker_ws_fargate.arn
  }

  lifecycle {
    replace_triggered_by = [aws_lb_target_group.tunnelbroker_ws_fargate]
  }
}

resource "aws_lb_listener" "tunnelbroker_grpc" {
  count             = local.is_staging ? 1 : 0
  load_balancer_arn = aws_lb.tunnelbroker.arn
  port              = local.tunnelbroker_config.grpc_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.tunnelbroker.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tunnelbroker_grpc_fargate.arn
  }

  lifecycle {
    replace_triggered_by = [aws_lb_target_group.tunnelbroker_grpc_fargate]
  }
}

# SSL Certificate
data "aws_acm_certificate" "tunnelbroker" {
  domain   = local.tunnelbroker_config.domain_name
  statuses = ["ISSUED"]
}

output "rabbitmq_console_url" {
  value = aws_mq_broker.tunnelbroker_rabbitmq.instances[0].console_url
}
