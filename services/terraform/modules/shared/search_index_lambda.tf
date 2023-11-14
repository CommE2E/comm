variable iam_role_arn {
  default = "arn:aws:iam::000000000000:role/lambda-role"
}

variable lambda_zip_dir {
  type = string
  # default = "${path.module}/../../../search-index-lambda/target/lambda/search-index-lambda"
  default = "../../search-index-lambda/target/lambda/search-index-lambda"
}

# data "archive_file" "lambda_zip" {
#   type        = "zip"
#   source_dir  = var.lambda_zip_dir
#   output_path = "${var.lambda_zip_dir}/bootstrap.zip"
# }

resource "aws_lambda_function" "search_index_lambda" {
  function_name    = "search-index-lambda-function"
  # filename         = data.archive_file.lambda_zip_file.output_path
  # filename         = var.lambda_zip_path
  # filename         = "${path.module}/../../../search-index-lambda/target/lambda/search-index-lambda/bootstrap.zip"
  filename           = "${var.lambda_zip_dir}/bootstrap.zip"
  # source_code_hash = "${data.archive_file.lambda_zip.output_base64sha256}"
  source_code_hash = filebase64sha256("${var.lambda_zip_dir}/bootstrap.zip")
  handler          = "bootstrap"
  # role             = aws_iam_role.lambda_assume_role.arn
  # role             = "arn:aws:iam::000000000000:role/lambda-role"
  role             = var.iam_role_arn
  # runtime          = "provided.al2"
  runtime          = "provided.al2"
  architectures    = ["arm64"]
  memory_size      = 5120
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

# data "archive_file" "lambda_zip_file" {
#   output_path = "${path.module}/lambda_zip/lambda.zip"
#   source_dir  = "${path.module}/../../../search-index-lambda/target/lambda/bootstrap.zip"
#   excludes    = ["__init__.py", "*.pyc"]
#   type        = "zip"
# }

# resource "aws_lambda_event_source_mapping" "example" {
#   event_source_arn  = aws_dynamodb_table.dynamodb_table.stream_arn
#   function_name     = aws_lambda_function.lambda_function.arn
#   starting_position = "LATEST"
# }

# resource "aws_iam_role" "lambda_assume_role" {
#   name               = "lambda-dynamodb-role"
#   assume_role_policy = <<EOF
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Action": "sts:AssumeRole",
#       "Principal": {
#         "Service": "lambda.amazonaws.com"
#       },
#       "Effect": "Allow",
#       "Sid": "LambdaAssumeRole"
#     }
#   ]
# }
# EOF
# }

# resource "aws_iam_role_policy" "dynamodb_read_log_policy" {
#   name   = "lambda-dynamodb-log-policy"
#   role   = aws_iam_role.lambda_assume_role.id
#   policy = <<EOF
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#         "Action": [ "logs:*" ],
#         "Effect": "Allow",
#         "Resource": [ "arn:aws:logs:*:*:*" ]
#     },
#     {
#         "Action": [ "dynamodb:BatchGetItem",
#                     "dynamodb:GetItem",
#                     "dynamodb:GetRecords",
#                     "dynamodb:Scan", We will have the recores inside of the lambda function in event `object`. We can also configure the stream to capture additional data such as "before" and "after" images of modified items.
#                     "dynamodb:Query",
#                     "dynamodb:GetShardIterator",
#                     "dynamodb:DescribeStream",
#                     "dynamodb:ListStreams" ],
#         "Effect": "Allow",
#         "Resource": [
#           "${aws_dynamodb_table.dynamodb_table.arn}",
#           "${aws_dynamodb_table.dynamodb_table.arn}/*"
#         ]
#     }
#   ]
# }
# EOF
# }
