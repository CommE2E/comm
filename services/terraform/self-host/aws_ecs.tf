locals {
  keyserver_service_image_tag = "1.0.102"
  keyserver_service_server_image = (var.custom_keyserver_image != null ?
    var.custom_keyserver_image :
  "commapp/keyserver:${local.keyserver_service_image_tag}")
}

resource "aws_ecs_cluster" "keyserver_cluster" {
  # Do not change without replacing cluster_name in aws-deploy.sh
  name = "keyserver-cluster"

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
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
