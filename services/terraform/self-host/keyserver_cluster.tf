locals {
  keyserver_service_image_tag = "1.0.131"
  keyserver_service_server_image = (var.custom_keyserver_image != null ?
    var.custom_keyserver_image :
  "commapp/keyserver:${local.keyserver_service_image_tag}")
}

resource "aws_ecs_cluster" "keyserver_cluster" {
  # Do not change without replacing cluster_name in aws-deploy.sh
  name = "keyserver-cluster"

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }
}

# Namespace for services to be able to communicate with each other
# by their hostnames. Similar to docker compose network.
resource "aws_service_discovery_http_namespace" "keyserver_cluster" {
  name = "keyserver-cluster-http-namespace"
  tags = {
    "AmazonECSManaged" = "true"
  }
}

resource "aws_ecs_cluster_capacity_providers" "keyserver_cluster" {
  cluster_name       = aws_ecs_cluster.keyserver_cluster.name
  capacity_providers = ["FARGATE"]
}

resource "aws_security_group" "keyserver_service" {
  name   = "keyserver-service-ecs-sg"
  vpc_id = local.vpc_id

  # Allow all inbound traffic  on port 3000
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description      = "Allow inbound traffic from any IPv6 address"
    from_port        = 3000
    to_port          = 3000
    protocol         = "tcp"
    ipv6_cidr_blocks = ["::/0"]
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
