# Elasticache Security Group
resource "aws_security_group" "keyserver_redis_security_group" {
  name        = "elasticache-redis-sg"
  description = "Allow inbound traffic on port 6379 and all outbound traffic"
  vpc_id      = data.aws_vpc.default.id

  # Inbound rules
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound rules
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_serverless_cache" "redis" {
  engine = "redis"
  name   = "example"
  cache_usage_limits {
    data_storage {
      maximum = 1
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 34000
    }
  }

  daily_snapshot_time      = "09:00"
  description              = "Keyserver Redis"
  major_engine_version     = "7"
  snapshot_retention_limit = 1
  security_group_ids       = [aws_security_group.keyserver_redis_security_group.id]
  subnet_ids               = [data.aws_subnets.default.ids[0], data.aws_subnets.default.ids[1]]
}
