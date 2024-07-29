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
    "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess",
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    # Let ECS write logs to CloudWatch
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
    # Let ECS tasks access secrets to expose them as env vars
    "arn:aws:iam::aws:policy/SecretsManagerReadWrite",
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

# Role with allow ecs exec 
resource "aws_iam_role" "ecs_task_role" {
  name               = "ecs-iam_role"
  description        = "Allows to SSH into ECS containers"
  assume_role_policy = data.aws_iam_policy_document.assume_role_ecs_ec2.json

  managed_policy_arns = [
    aws_iam_policy.allow_ecs_exec.arn,
  ]
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
    aws_iam_policy.read_services_token.arn,
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
  ]
}

# Services token read policy
data "aws_iam_policy_document" "read_services_token" {
  statement {
    sid    = "SecretsManagerReadServicesToken"
    effect = "Allow"
    actions = [
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecretVersionIds"
    ]
    resources = [
      module.shared.services_token_id
    ]
  }
}
resource "aws_iam_policy" "read_services_token" {
  name        = "service-to-service-token-read-access"
  policy      = data.aws_iam_policy_document.read_services_token.json
  description = "Allows full read access to service-to-service token SecretsManager secret"
}

# Feature Flags IAM
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
      module.shared.dynamodb_tables["feature-flags"].arn
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

# Backup Service IAM
data "aws_iam_policy_document" "manage_backup_ddb" {
  statement {
    sid    = "BackupFullDDBAccess"
    effect = "Allow"
    actions = [
      "dynamodb:*",
    ]
    resources = [
      module.shared.dynamodb_tables["backup-service-backup"].arn,
      "${module.shared.dynamodb_tables["backup-service-backup"].arn}/index/*",
      module.shared.dynamodb_tables["backup-service-log"].arn,
    ]
  }
}
resource "aws_iam_policy" "manage_backup_ddb" {
  name        = "backup-ddb-full-access"
  policy      = data.aws_iam_policy_document.manage_backup_ddb.json
  description = "Allows full access to backup DynamoDB table"
}
resource "aws_iam_role" "backup_service" {
  name               = "backup-service-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_ecs_ec2.json

  managed_policy_arns = [
    aws_iam_policy.allow_ecs_exec.arn,
    aws_iam_policy.manage_backup_ddb.arn,
    aws_iam_policy.read_services_token.arn,
  ]
}

# Reports Service IAM
data "aws_iam_policy_document" "manage_reports_ddb" {
  statement {
    sid    = "ReportsFullDDBAccess"
    effect = "Allow"
    actions = [
      "dynamodb:*",
    ]
    resources = [
      module.shared.dynamodb_tables["reports-service-reports"].arn
    ]
  }
}
resource "aws_iam_policy" "manage_reports_ddb" {
  name        = "reports-ddb-full-access"
  policy      = data.aws_iam_policy_document.manage_reports_ddb.json
  description = "Allows full access to reports DynamoDB table"
}
resource "aws_iam_role" "reports_service" {
  name               = "reports-service-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_ecs_ec2.json

  managed_policy_arns = [
    aws_iam_policy.allow_ecs_exec.arn,
    aws_iam_policy.manage_reports_ddb.arn,
    aws_iam_policy.read_services_token.arn,
  ]
}

# Identity Search

data "aws_iam_policy_document" "assume_identity_search_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "search_index_lambda" {
  name               = "search_index_lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_identity_search_role.json
}

resource "aws_iam_role_policy_attachment" "AWSLambdaVPCAccessExecutionRole" {
  role       = aws_iam_role.search_index_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "manage_cloudwatch_logs" {
  role       = aws_iam_role.search_index_lambda.name
  policy_arn = aws_iam_policy.manage_cloudwatch_logs.arn

}

resource "aws_iam_role_policy_attachment" "manage_network_interface" {
  role       = aws_iam_role.search_index_lambda.name
  policy_arn = aws_iam_policy.manage_network_interface.arn
}

resource "aws_iam_role_policy_attachment" "read_identity_users_stream" {
  role       = aws_iam_role.search_index_lambda.name
  policy_arn = aws_iam_policy.read_identity_users_stream.arn
}

data "aws_iam_policy_document" "read_identity_users_stream" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:DescribeStream",
      "dynamodb:ListStreams",
    ]
    resources = [
      module.shared.dynamodb_tables["identity-users"].stream_arn,
      "${module.shared.dynamodb_tables["identity-users"].arn}/stream/*",
      module.shared.dynamodb_tables["identity-reserved-usernames"].stream_arn,
      "${module.shared.dynamodb_tables["identity-reserved-usernames"].arn}/stream/*",
    ]
  }
}

resource "aws_iam_policy" "read_identity_users_stream" {
  name        = "read-identity-users-stream"
  path        = "/"
  description = "IAM policy for managing identity-users stream"
  policy      = data.aws_iam_policy_document.read_identity_users_stream.json
}

data "aws_iam_policy_document" "manage_cloudwatch_logs" {
  statement {
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_policy" "manage_cloudwatch_logs" {
  name        = "manage-cloudwatch-logs"
  path        = "/"
  description = "IAM policy for managing cloudwatch logs"
  policy      = data.aws_iam_policy_document.manage_cloudwatch_logs.json
}

data "aws_iam_policy_document" "manage_network_interface" {
  statement {
    effect = "Allow"

    actions = [
      "ec2:CreateNetworkInterface",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DeleteNetworkInterface"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "manage_network_interface" {
  name        = "manage-network-interface"
  path        = "/"
  description = "IAM policy for managing network interfaces"
  policy      = data.aws_iam_policy_document.manage_network_interface.json
}


data "aws_iam_policy_document" "opensearch_domain_access" {
  statement {
    effect = "Allow"

    actions = [
      "es:ESHttpHead",
      "es:ESHttpPost",
      "es:ESHttpGet",
      "es:ESHttpDelete",
      "es:ESHttpPut",
    ]

    resources = ["${module.shared.opensearch_domain_identity.arn}/*"]
  }
}

resource "aws_iam_policy" "opensearch_domain_access" {
  name   = "opensearch-domain-access-policy"
  policy = data.aws_iam_policy_document.opensearch_domain_access.json
}

resource "aws_opensearch_domain_policy" "opensearch_domain_access" {
  domain_name     = module.shared.opensearch_domain_identity.domain_name
  access_policies = data.aws_iam_policy_document.opensearch_domain_access.json
}

resource "aws_iam_role_policy_attachment" "search_index_lambda_opensearch_access" {
  role       = aws_iam_role.search_index_lambda.name
  policy_arn = aws_iam_policy.opensearch_domain_access.arn
}

resource "aws_iam_role" "task_scheduler" {
  name = "cron-scheduler-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = ["scheduler.amazonaws.com"]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
