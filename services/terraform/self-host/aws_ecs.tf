resource "aws_ecs_cluster" "keyserver_cluster" {
  name = "keyserver-cluster"

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.keyserver_cluster.arn
  }
}

# Namespace for services to be able to communicate with each other
# by their hostnames. Similar to docker compose network.
resource "aws_service_discovery_http_namespace" "keyserver_cluster" {
  name = "keyserver-cluster-http-namespace"
  tags = {
    "AmazonECSManaged" = "true"
  }
}

resource "aws_ecs_cluster_capacity_providers" "keyserver_cluster" {
  cluster_name       = aws_ecs_cluster.keyserver_cluster.name
  capacity_providers = ["FARGATE"]
}
