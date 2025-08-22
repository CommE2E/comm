locals {
  exported_dynamodb_tables = [
    aws_dynamodb_table.feature-flags,
    aws_dynamodb_table.backup-service-backup,
    aws_dynamodb_table.backup-service-log,
    aws_dynamodb_table.reports-service-reports,
    aws_dynamodb_table.tunnelbroker-undelivered-messages,
    aws_dynamodb_table.identity-users,
    aws_dynamodb_table.identity-reserved-usernames,
    aws_dynamodb_table.farcaster-tokens,
  ]
}

# map table names to their resources
output "dynamodb_tables" {
  value = {
    for table in local.exported_dynamodb_tables :
    table.name => table
  }
}


output "opensearch_domain_identity" {
  value = aws_opensearch_domain.identity-search
}

output "search_index_lambda" {
  value = aws_lambda_function.search_index_lambda
}
