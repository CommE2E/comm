locals {
  public_services = {
    backup = {
      enabled            = local.service_enabled.backup
      hostname           = local.backup_service_domain_name
      route53_record_key = "Backup"
      route53_managed    = true
      off_aws_record_ip  = null
    }
    blob = {
      enabled            = local.service_enabled.blob
      hostname           = local.blob_service_domain_name
      route53_record_key = "Blob"
      route53_managed    = true
      off_aws_record_ip  = null
    }
    electron_update = {
      enabled            = local.service_enabled.electron_update
      hostname           = local.electron_update_domain_name
      route53_record_key = "ElectronUpdate"
      route53_managed    = true
      off_aws_record_ip  = local.off_aws_service_a_record_ips.ElectronUpdate
    }
    feature_flags = {
      enabled            = local.service_enabled.feature_flags
      hostname           = local.feature_flags_domain_name
      route53_record_key = "FeatureFlags"
      route53_managed    = true
      off_aws_record_ip  = null
    }
    identity = {
      enabled            = local.service_enabled.identity
      hostname           = local.identity_service_domain_name
      route53_record_key = "Identity"
      route53_managed    = true
      off_aws_record_ip  = null
    }
    landing = {
      enabled            = local.service_enabled.landing
      hostname           = local.is_staging ? "landing.staging.comm.app" : "comm.app"
      route53_record_key = "Landing"
      route53_managed    = false
      off_aws_record_ip  = null
    }
    reports = {
      enabled            = local.service_enabled.reports
      hostname           = local.reports_service_domain_name
      route53_record_key = "Reports"
      route53_managed    = true
      off_aws_record_ip  = null
    }
    tunnelbroker = {
      enabled            = local.service_enabled.tunnelbroker
      hostname           = local.tunnelbroker_config.domain_name
      route53_record_key = "Tunnelbroker"
      route53_managed    = true
      off_aws_record_ip  = null
    }
    webapp = {
      enabled            = local.service_enabled.webapp
      hostname           = local.is_staging ? "web.staging.comm.app" : "web.comm.app"
      route53_record_key = "Webapp"
      route53_managed    = false
      off_aws_record_ip  = null
    }
  }

  public_ingress_endpoints = {
    backup_https = {
      enabled                                       = local.public_services.backup.enabled
      hostname                                      = local.public_services.backup.hostname
      listener_port                                 = 443
      certificate_domain                            = local.public_services.backup.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-backup-http-tg"
      target_group_arn                              = null
      target_group_port                             = local.backup_service_container_http_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = null
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/health"
      target_group_health_check_matcher             = "200-204"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    blob_https = {
      enabled                                       = local.public_services.blob.enabled
      hostname                                      = local.public_services.blob.hostname
      listener_port                                 = 443
      certificate_domain                            = local.public_services.blob.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-blob-http-tg"
      target_group_arn                              = null
      target_group_port                             = local.blob_service_container_http_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = null
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/health"
      target_group_health_check_matcher             = "200-499"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    electron_update_https = {
      enabled                                       = local.public_services.electron_update.enabled
      hostname                                      = local.public_services.electron_update.hostname
      listener_port                                 = 443
      certificate_domain                            = local.public_services.electron_update.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-elupd-http-tg"
      target_group_arn                              = null
      target_group_port                             = local.electron_update_container_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = null
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/"
      target_group_health_check_matcher             = "200"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    feature_flags_https = {
      enabled                                       = local.public_services.feature_flags.enabled
      hostname                                      = local.public_services.feature_flags.hostname
      listener_port                                 = 443
      certificate_domain                            = local.public_services.feature_flags.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-flags-http-tg"
      target_group_arn                              = null
      target_group_port                             = local.feature_flags_container_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = null
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/features"
      target_group_health_check_matcher             = "200-499"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    identity_grpc = {
      enabled                                       = local.public_services.identity.enabled
      hostname                                      = local.public_services.identity.hostname
      listener_port                                 = local.identity_service_grpc_public_port
      certificate_domain                            = local.public_services.identity.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-ident-grpc-tg"
      target_group_arn                              = null
      target_group_port                             = local.identity_service_container_grpc_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = "HTTP2"
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = "traffic-port"
      target_group_health_check_path                = "/"
      target_group_health_check_matcher             = "200-499"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = true
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 10
    }
    identity_ws = {
      enabled                                       = local.public_services.identity.enabled
      hostname                                      = local.public_services.identity.hostname
      listener_port                                 = local.identity_service_container_ws_port
      certificate_domain                            = local.public_services.identity.hostname
      ssl_policy                                    = "ELBSecurityPolicy-2016-08"
      target_group_name                             = "comm-shrd-ident-ws-tg"
      target_group_arn                              = null
      target_group_port                             = local.identity_service_container_ws_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = "HTTP1"
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/health"
      target_group_health_check_matcher             = "200"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    landing_https = {
      enabled                                       = local.public_services.landing.enabled
      hostname                                      = local.public_services.landing.hostname
      listener_port                                 = 443
      certificate_domain                            = local.public_services.landing.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-landing-http-tg"
      target_group_arn                              = null
      target_group_port                             = 3000
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = null
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/health"
      target_group_health_check_matcher             = "200"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = true
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86500
    }
    reports_https = {
      enabled                                       = local.public_services.reports.enabled
      hostname                                      = local.public_services.reports.hostname
      listener_port                                 = 443
      certificate_domain                            = local.public_services.reports.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-reports-http-tg"
      target_group_arn                              = null
      target_group_port                             = local.reports_service_container_http_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = null
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/health"
      target_group_health_check_matcher             = "200-204"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    tunnelbroker_grpc = {
      enabled                                       = local.tunnelbroker_grpc_service_enabled
      hostname                                      = local.public_services.tunnelbroker.hostname
      listener_port                                 = local.tunnelbroker_config.grpc_port
      certificate_domain                            = local.public_services.tunnelbroker.hostname
      ssl_policy                                    = "ELBSecurityPolicy-2016-08"
      target_group_name                             = "comm-shrd-tb-grpc-tg"
      target_group_arn                              = null
      target_group_port                             = local.tunnelbroker_config.grpc_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = "GRPC"
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = "traffic-port"
      target_group_health_check_path                = "/AWS.ALB/healthcheck"
      target_group_health_check_matcher             = "12"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    tunnelbroker_ws = {
      enabled                                       = local.public_services.tunnelbroker.enabled
      hostname                                      = local.public_services.tunnelbroker.hostname
      listener_port                                 = local.tunnelbroker_config.websocket_port
      certificate_domain                            = local.public_services.tunnelbroker.hostname
      ssl_policy                                    = "ELBSecurityPolicy-2016-08"
      target_group_name                             = "comm-shrd-tb-ws-tg"
      target_group_arn                              = null
      target_group_port                             = local.tunnelbroker_config.websocket_port
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = "HTTP1"
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/health"
      target_group_health_check_matcher             = "200"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = false
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86400
    }
    webapp_https = {
      enabled                                       = local.public_services.webapp.enabled
      hostname                                      = local.public_services.webapp.hostname
      listener_port                                 = 443
      certificate_domain                            = local.public_services.webapp.hostname
      ssl_policy                                    = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      target_group_name                             = "comm-shrd-webapp-http-tg"
      target_group_arn                              = null
      target_group_port                             = 3000
      target_group_protocol                         = "HTTP"
      target_group_protocol_version                 = null
      target_group_health_check_protocol            = "HTTP"
      target_group_health_check_port                = null
      target_group_health_check_path                = "/health"
      target_group_health_check_matcher             = "200"
      target_group_health_check_healthy_threshold   = 2
      target_group_health_check_unhealthy_threshold = 3
      target_group_stickiness_enabled               = true
      target_group_stickiness_type                  = "lb_cookie"
      target_group_stickiness_cookie_duration       = 86500
    }
  }

  shared_public_ingress_enabled = (
    length([
      for endpoint in values(local.public_ingress_endpoints) :
      endpoint if endpoint.enabled
    ]) > 0
  )
}

module "shared_public_ingress" {
  source = "../modules/shared_public_ingress"

  create_resources   = local.shared_public_ingress_enabled
  load_balancer_name = "comm-shared-public-lb"
  vpc_id             = aws_vpc.default.id
  public_subnet_ids = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
  endpoints = local.public_ingress_endpoints
}
