variable "search_index_lambda_iam_role_arn" {
  default = "arn:aws:iam::000000000000:role/lambda-role"
}


variable "lambda_zip_dir" {
  type    = string
  default = "../../search-index-lambda/target/lambda/search-index-lambda"
}

check "lambda_zip_check" {
  assert {
    condition     = fileexists("${var.lambda_zip_dir}/bootstrap.zip")
    error_message = "Lambda bootstrap.zip not found at path. Please run 'terraform-init.sh' in remote or 'run.sh' in dev"
  }
}

resource "aws_lambda_function" "search_index_lambda" {
  function_name    = "search-index-lambda-function"
  filename         = "${var.lambda_zip_dir}/bootstrap.zip"
  source_code_hash = filebase64sha256("${var.lambda_zip_dir}/bootstrap.zip")
  handler          = "bootstrap"
  role             = var.search_index_lambda_iam_role_arn
  runtime          = "provided.al2"
  architectures    = ["arm64"]
  timeout          = 300

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.search_index_lambda.id]
  }

  environment {
    variables = {
      RUST_BACKTRACE      = "1"
      OPENSEARCH_ENDPOINT = aws_opensearch_domain.identity-search.endpoint
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_event_source_mapping" "identity_users_trigger" {
  event_source_arn       = aws_dynamodb_table.identity-users.stream_arn
  function_name          = aws_lambda_function.search_index_lambda.arn
  starting_position      = "LATEST"
  maximum_retry_attempts = 2
}

resource "aws_lambda_event_source_mapping" "identity_reserved_usernames_trigger" {
  event_source_arn       = aws_dynamodb_table.identity-reserved-usernames.stream_arn
  function_name          = aws_lambda_function.search_index_lambda.arn
  starting_position      = "LATEST"
  maximum_retry_attempts = 2
}

resource "aws_security_group" "search_index_lambda" {
  name   = "search_index_lambda_sg"
  vpc_id = var.vpc_id

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_lambda_function_event_invoke_config" "search-index-lambda" {
  function_name                = aws_lambda_function.search_index_lambda.function_name
  maximum_event_age_in_seconds = 60
}
