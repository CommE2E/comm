locals {
  exported_dynamodb_tables = [
    aws_dynamodb_table.feature-flags,
    aws_dynamodb_table.reports-service-reports,
  ]
}

# map table names to their resources
output "dynamodb_tables" {
  value = {
    for table in local.exported_dynamodb_tables :
    table.name => table
  }
}
