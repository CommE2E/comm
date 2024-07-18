data "dotenv" "local" {}

locals {
  default_environment_vars = {
    "COMM_DATABASE_PORT" = "3307"
  }

  local_with_default_environment_vars = merge(
    local.default_environment_vars,
    data.dotenv.local.entries
  )

  aws_resource_environment_vars = {
    "REDIS_URL"          = "rediss://${aws_elasticache_serverless_cache.redis.endpoint[0].address}:6379"
    "COMM_DATABASE_HOST" = "${aws_db_instance.mariadb.address}"
  }

  shared_environment_vars = merge(
    local.local_with_default_environment_vars,
    local.aws_resource_environment_vars
  )
}

