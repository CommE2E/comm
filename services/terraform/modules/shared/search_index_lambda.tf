variable iam_role_arn {
  default = "arn:aws:iam::000000000000:role/lambda-role"
}

variable lambda_zip_dir {
  type = string
  default = "../../search-index-lambda/target/lambda/search-index-lambda"
}

resource "aws_lambda_function" "search_index_lambda" {
  function_name    = "search-index-lambda-function"
  filename           = "${var.lambda_zip_dir}/bootstrap.zip"
  source_code_hash = filebase64sha256("${var.lambda_zip_dir}/bootstrap.zip")
  handler          = "bootstrap"
  role             = var.iam_role_arn
  runtime          = "provided.al2"
  architectures    = ["arm64"]
  timeout          = 300

  environment {
    variables = {
      RUST_BACKTRACE = "1"
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_event_source_mapping" "trigger" {
  count = var.is_dev ? 0 : 1 
  event_source_arn  = aws_dynamodb_table.identity-users.stream_arn
  function_name     = aws_lambda_function.search_index_lambda.arn
  starting_position = "LATEST"
}
