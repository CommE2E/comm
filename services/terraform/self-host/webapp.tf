locals {
  webapp_container_name = "webapp"

  webapp_run_server_config = jsonencode({
    runKeyserver = false
    runWebApp    = true
    runLanding   = false
  })

  webapp_environment_vars = merge(local.shared_environment_vars,
    {
      "COMM_NODE_ROLE"                          = "webapp",
      "COMM_JSONCONFIG_facts_run_server_config" = local.webapp_run_server_config
  })
}

module "webapp_service" {
  source = "../modules/keyserver_node_service"
  count  = var.enable_webapp_service ? 1 : 0

  container_name              = "webapp"
  image                       = local.keyserver_service_server_image
  service_name                = "webapp"
  cluster_id                  = aws_ecs_cluster.keyserver_cluster.id
  domain_name                 = var.webapp_domain_name
  vpc_id                      = local.vpc_id
  vpc_subnets                 = local.vpc_subnets
  region                      = var.region
  environment_vars            = local.webapp_environment_vars
  ecs_task_role_arn           = aws_iam_role.ecs_task_role.arn
  ecs_task_execution_role_arn = aws_iam_role.ecs_task_execution.arn
}
