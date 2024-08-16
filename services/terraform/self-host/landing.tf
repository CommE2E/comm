locals {
  landing_container_name = "landing"

  landing_run_server_config = jsonencode({
    runKeyserver = false
    runWebApp    = false
    runLanding   = true
  })

  landing_environment_vars = merge(local.shared_environment_vars,
    {
      "COMM_NODE_ROLE"                          = "landing",
      "COMM_JSONCONFIG_facts_run_server_config" = local.landing_run_server_config
  })
}

module "landing_service" {
  source = "../modules/keyserver_node_service"
  count  = var.enable_landing_service ? 1 : 0

  container_name              = "landing"
  image                       = var.keyserver_image
  service_name                = "landing"
  cluster_id                  = aws_ecs_cluster.keyserver_cluster.id
  domain_name                 = var.landing_domain_name
  vpc_id                      = local.vpc_id
  vpc_subnets                 = local.vpc_subnets
  region                      = var.region
  environment_vars            = local.landing_environment_vars
  ecs_task_role_arn           = aws_iam_role.ecs_task_role.arn
  ecs_task_execution_role_arn = aws_iam_role.ecs_task_execution.arn
}
