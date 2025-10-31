resource "aws_ecs_cluster" "comm_services" {
  name = "comm-services-ecs-cluster"

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.comm_services.arn
  }
}

# Namespace for services to be able to communicate with each other
# by their hostnames. Similiar to docker compose network.
resource "aws_service_discovery_http_namespace" "comm_services" {
  name = "comm-services-ecs-cluster"
  tags = {
    # This tag was added by AWS Console because this resource
    # was auto-created along with the cluster.
    # It should be left as-is until we need a custom namespace.
    "AmazonECSManaged" = "true"
  }
}





resource "aws_ecs_cluster_capacity_providers" "ecs_ec2" {
  cluster_name = aws_ecs_cluster.comm_services.name
  capacity_providers = [
    "FARGATE",
    "FARGATE_SPOT"
  ]
}
