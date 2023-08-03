resource "aws_ecs_cluster" "comm_services" {
  name = "comm-services-ecs-cluster"

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.comm_services.arn
  }
}

# Namespace for services to be able to communicate with each other
# by their hostnames. Similiar to docker compose network.
resource "aws_service_discovery_http_namespace" "comm_services" {
  name = "comm-services-ecs-cluster"
  tags = {
    # This tag was added by AWS Console because this resource
    # was auto-created along with the cluster.
    # It should be left as-is until we need a custom namespace.
    "AmazonECSManaged" = "true"
  }
}

# ECS-Optimized Amazon Linux 2 x86_64
data "aws_ami" "al2_x86_ecs" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-2.0.20230705-x86_64-ebs"]
  }
}

# Autoscaling configuration
resource "aws_iam_instance_profile" "ecs_instance_profile" {
  # AWS Console creates profiles with the same name as IAM roles.
  # We do the same here.
  name = aws_iam_role.ecs_instance_role.name
  role = aws_iam_role.ecs_instance_role.name
}
resource "aws_launch_template" "ecs_services" {
  name_prefix   = "services-ecs-ec2-"
  image_id      = data.aws_ami.al2_x86_ecs.id
  instance_type = "t3.small"

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  metadata_options {
    # Enable IDMSv2
    http_tokens            = "required"
    http_endpoint          = "enabled"
    instance_metadata_tags = "enabled"

    # This option is required for apps inside ECS containers to be able
    # to connect to AWS API. Rust AWS SDK fails with timeout errors without it.
    http_put_response_hop_limit = 4
  }

  user_data = base64encode(<<-EOT
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.comm_services.name} >> /etc/ecs/ecs.config;
    EOT
  )
}

resource "aws_autoscaling_group" "ecs_services" {
  name     = "services-ecs-ec2-asg"
  min_size = 0
  max_size = 3

  # NOTE: desired_capacity is managed by ECS Capacity Provider
  # This value sets only initial number of instances
  desired_capacity = 1
  lifecycle { ignore_changes = [desired_capacity] }

  launch_template {
    id      = aws_launch_template.ecs_services.id
    version = "$Latest"
  }

  vpc_zone_identifier = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]

  # NOTE: This tag is required for ECS Capacity Provider to work
  # See https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_capacity_provider
  tag {
    key                 = "AmazonECSManaged"
    value               = true
    propagate_at_launch = true
  }

  # This name is set to all instances so we can easily distinguish them
  # in the console.
  tag {
    key                 = "Name"
    value               = "ECS - Comm Services"
    propagate_at_launch = true
  }
}

resource "aws_ecs_capacity_provider" "ecs_ec2" {
  name = "services-capacity-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs_services.arn

    managed_scaling {
      status          = "ENABLED"
      target_capacity = 100
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "ecs_ec2" {
  cluster_name = aws_ecs_cluster.comm_services.name
  capacity_providers = [
    "FARGATE",
    "FARGATE_SPOT",
    aws_ecs_capacity_provider.ecs_ec2.name
  ]
}
