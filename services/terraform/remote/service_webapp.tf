locals {
  webapp_container_name = "webapp"

  webapp_run_server_config = jsonencode({
    runKeyserver = false
    runWebApp    = true
    runLanding   = false
  })

  webapp_environment_vars = merge(
    local.webapp_landing_environment_vars_encoded,
    local.stage_specific_environment_vars_encoded,
    local.shared_keyserver_environment_vars,
    {
      "COMM_NODE_ROLE"                          = "webapp",
      "COMM_JSONCONFIG_facts_run_server_config" = local.webapp_run_server_config
  })
}

module "webapp_service" {
  source = "../modules/keyserver_node_service"

  ingress_mode                = "shared"
  desired_count               = local.fixed_count_service_desired_counts.webapp
  service_enabled             = local.service_enabled.webapp
  container_name              = "webapp"
  image                       = local.keyserver_image
  service_name                = "webapp"
  cluster_id                  = aws_ecs_cluster.comm_services.id
  domain_name                 = local.is_staging ? "web.staging.comm.app" : "web.comm.app"
  vpc_id                      = aws_vpc.default.id
  vpc_subnets                 = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  region                      = "us-east-2"
  environment_vars            = local.webapp_environment_vars
  ecs_task_role_arn           = aws_iam_role.keyserver_node_ecs_task_role.arn
  ecs_task_execution_role_arn = aws_iam_role.ecs_task_execution.arn
  public_ingress_security_group_id = (
    module.shared_public_ingress.public_ingress_security_group_id
  )
  internal_service_security_group_id = (
    aws_security_group.comm_services_internal.id
  )
  target_group_name = (
    local.public_ingress_endpoint_definitions.webapp_https.target_group_name
  )
}

output "webapp_service_load_balancer_dns_name" {
  value = (
    local.service_enabled.webapp
    ? module.shared_public_ingress.load_balancer_dns_name
    : null
  )
}
