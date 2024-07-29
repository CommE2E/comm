locals {
  webapp_image_tag      = "1.0.102"
  webapp_service_image  = "commapp/keyserver:${local.webapp_image_tag}"
  webapp_container_name = "webapp"

  webapp_run_server_config = jsonencode({
    runKeyserver = false
    runWebApp    = true
    runLanding   = false
  })

  webapp_environment_vars = merge(data.dotenv.local.entries,
    {
      "COMM_NODE_ROLE"                          = "webapp",
      "COMM_JSONCONFIG_facts_run_server_config" = local.webapp_run_server_config
  })
}

module "webapp_service" {
  source = "../modules/node_service"

  container_name              = "webapp"
  image                       = local.webapp_service_image
  service_name                = "webapp"
  cluster_id                  = aws_ecs_cluster.comm_services.id
  domain_name                 = local.is_staging ? "comm.software" : "web.comm.app"
  vpc_id                      = aws_vpc.default.id
  vpc_subnets                 = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  region                      = "us-east-2"
  environment_vars            = local.webapp_environment_vars
  ecs_task_role_arn           = aws_iam_role.ecs_task_role.arn
  ecs_task_execution_role_arn = aws_iam_role.ecs_task_execution.arn
}

output "webapp_service_load_balancer_dns_name" {
  value = module.webapp_service.service_load_balancer_dns_name
}
