locals {
  identity_service_image_tag      = local.is_staging ? "0.54.9" : "0.54.9"
  identity_service_server_image   = "commapp/identity-server:${local.identity_service_image_tag}"
  identity_service_container_name = "identity-server"

  # Port that the container is listening on
  identity_service_container_grpc_port = 50054
  identity_sc_port_name                = "identity-service-ecs-grpc"
  identity_sc_dns_name                 = "identity-service"

  # Port that Websocket server listens on
  identity_service_container_ws_port = 51004
  identity_sc_ws_port_name           = "identity-service-ecs-ws"

  # URL accessible by other services in the same Service Connect namespace
  # This renders to e.g. 'http://identity-service:50054'
  identity_local_url = "http://${local.identity_sc_dns_name}:${local.identity_service_container_grpc_port}"

  # Fargate-specific URL for Fargate services to communicate with Fargate identity service
  identity_fargate_url = "http://${local.identity_sc_dns_name}-fargate:${local.identity_service_container_grpc_port}"

  # Port that is exposed to the public SSL endpoint (appended to domain name)
  identity_service_grpc_public_port = 50054
  identity_service_domain_name      = "identity.${local.root_domain}"

  opaque_server_setup_secret_name = "identity/ServerSetup"
  staging_allow_origin_list       = <<EOT
    http://localhost:3000,
    http://localhost:3001,
    http://localhost:3002,
    http://localhost:3003,
    http://localhost:3004,
    http://localhost:3005,
    http://localhost:3006,
    http://localhost:3007,
    http://localhost:3008,
    http://localhost:3009
  EOT
  production_allow_origin_list    = <<EOT
    http://localhost:3000,
    http://localhost:3001,
    http://localhost:3002,
    http://localhost:3003,
    http://localhost:3004,
    http://localhost:3005,
    http://localhost:3006,
    http://localhost:3007,
    http://localhost:3008,
    http://localhost:3009,
    https://web.comm.app,
    https://web.staging.comm.app
  EOT
}

data "aws_secretsmanager_secret" "identity_server_setup" {
  name = local.opaque_server_setup_secret_name
}



# Security group to configure access to the service
resource "aws_security_group" "identity_service" {
  count = local.service_enabled.identity ? 1 : 0

  name   = "identity-service-ecs-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port       = local.identity_service_container_grpc_port
    to_port         = local.identity_service_container_grpc_port
    protocol        = "tcp"
    security_groups = [module.shared_public_ingress.public_ingress_security_group_id]
    description     = "gRPC port"
  }

  ingress {
    from_port       = local.identity_service_container_ws_port
    to_port         = local.identity_service_container_ws_port
    protocol        = "tcp"
    security_groups = [module.shared_public_ingress.public_ingress_security_group_id]
    description     = "Websocket port"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}
