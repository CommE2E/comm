locals {
  dns_services = {
    for service_name, service in local.public_services :
    service.route53_record_key => service
    if service.route53_managed && service.enabled
  }

  off_aws_service_a_records = {
    for service_name, service in local.public_services :
    service.route53_record_key => {
      domain = service.hostname
      ip     = service.off_aws_record_ip
    }
    if service.route53_managed && !service.enabled && service.off_aws_record_ip != null
  }
}

# Hosted zones are created manually in AWS Console
data "aws_route53_zone" "primary" {
  name = local.root_domain
}

resource "aws_route53_record" "service_load_balancer" {
  for_each = local.dns_services

  zone_id = data.aws_route53_zone.primary.id
  name    = each.value.hostname
  type    = "A"

  alias {
    # technically, we don't need the 'dualstack' prefix, but AWS console
    # always adds it, so we do the same for consistency
    name                   = "dualstack.${module.shared_public_ingress.load_balancer_dns_name}"
    zone_id                = module.shared_public_ingress.load_balancer_zone_id
    evaluate_target_health = true
  }

  depends_on = [
    aws_ecs_service.backup_service_fargate,
    aws_ecs_service.blob_service_fargate,
    aws_ecs_service.identity_service_fargate,
    aws_ecs_service.reports_service,
    aws_ecs_service.tunnelbroker_fargate,
    aws_ecs_service.electron_update,
    aws_ecs_service.feature_flags,
    module.webapp_service,
    module.landing_service,
  ]
}

resource "aws_route53_record" "off_aws_service_a_record" {
  for_each = local.off_aws_service_a_records

  allow_overwrite = true
  zone_id         = data.aws_route53_zone.primary.id
  name            = each.value.domain
  type            = "A"
  ttl             = 300
  records         = [each.value.ip]
}
