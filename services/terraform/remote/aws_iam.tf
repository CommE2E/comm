# ECS Task execution role
# Docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
data "aws_iam_role" "ecs_task_execution" {
  name = "ecsTaskExecutionRole"
}

data "aws_iam_role" "services_ddb_full_access" {
  name = "dynamodb-s3-full-access"
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

