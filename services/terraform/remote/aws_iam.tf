### General AWS Utility IAM resources

# Docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html
resource "aws_iam_role" "ecs_instance_role" {
  name        = "ecsInstanceRole"
  description = "Allows EC2 instances to call AWS services on your behalf."
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role",
    # Let instances download Docker images from ECR
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ]
}

# ECS Task execution role
# Docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecsTaskExecutionRole"
  assume_role_policy = jsonencode({
    Version = "2008-10-17"
    Statement = [
      {
        Sid    = ""
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    # Let ECS write logs to CloudWatch
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
  ]
}

# Assume Role Policy Document for EC2 and ECS
# This policy allows ECS and EC2 use roles that it is assigned to
data "aws_iam_policy_document" "assume_role_ecs_ec2" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole",
    ]
    principals {
      type = "Service"
      identifiers = [
        "ec2.amazonaws.com",
        "ecs-tasks.amazonaws.com"
      ]
    }
  }
}

# Allows ECS Exec to SSH into service task containers
resource "aws_iam_policy" "allow_ecs_exec" {
  name        = "allow-ecs-exec"
  description = "Adds SSM permissions to enable ECS Exec"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}

### App IAM resources

# Our app role - this is to give access to DynamoDB etc
# Has trust policy with EC2 and ECS
# Also allows to SSH into containers
resource "aws_iam_role" "services_ddb_full_access" {
  name               = "dynamodb-s3-full-access"
  description        = "Full RW access to DDB and S3. Allows to SSH into ECS containers"
  assume_role_policy = data.aws_iam_policy_document.assume_role_ecs_ec2.json

  managed_policy_arns = [
    aws_iam_policy.allow_ecs_exec.arn,
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
  ]
}

# Feature Flags IAM
data "aws_dynamodb_table" "feature_flags" {
  name = "feature-flags"
}
data "aws_iam_policy_document" "read_feature_flags" {
  statement {
    sid    = "FeatureFlagsDDBReadAccess"
    effect = "Allow"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]
    resources = [
      data.aws_dynamodb_table.feature_flags.arn,
    ]
  }
}
resource "aws_iam_policy" "read_feature_flags" {
  name        = "feature-flags-ddb-read-access"
  policy      = data.aws_iam_policy_document.read_feature_flags.json
  description = "Allows full read access to feature-flags DynamoDB table"
}
resource "aws_iam_role" "feature_flags_service" {
  name               = "feature-flags-service-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_ecs_ec2.json

  managed_policy_arns = [
    aws_iam_policy.read_feature_flags.arn
  ]
}

