locals {
  dns_service_configs = {
    Blob = {
      enabled = local.service_enabled.blob
      domain  = local.blob_service_domain_name
      lb      = aws_lb.blob_service
    }
    Backup = {
      enabled = local.service_enabled.backup
      domain  = local.backup_service_domain_name
      lb      = aws_lb.backup_service
    }
    ElectronUpdate = {
      enabled = local.service_enabled.electron_update
      domain  = local.electron_update_domain_name
      lb      = aws_lb.electron_update
    }
    FeatureFlags = {
      enabled = local.service_enabled.feature_flags
      domain  = local.feature_flags_domain_name
      lb      = aws_lb.feature_flags
    }
    Identity = {
      enabled = local.service_enabled.identity
      domain  = local.identity_service_domain_name
      lb      = aws_lb.identity_service
    }
    Reports = {
      enabled = local.service_enabled.reports
      domain  = local.reports_service_domain_name
      lb      = aws_lb.reports_service
    }
    Tunnelbroker = {
      enabled = local.service_enabled.tunnelbroker
      domain  = local.tunnelbroker_config.domain_name
      lb      = aws_lb.tunnelbroker
    }
  }

  dns_services = {
    for service_name, config in local.dns_service_configs :
    service_name => {
      domain = config.domain
      lb     = config.lb[0]
    }
    if config.enabled
  }

  off_aws_service_a_records = {
    for service_name, ip in local.off_aws_service_a_record_ips :
    service_name => {
      domain = local.dns_service_configs[service_name].domain
      ip     = ip
    }
  }
}

# Hosted zones are created manually in AWS Console
data "aws_route53_zone" "primary" {
  name = local.root_domain
}

resource "aws_route53_record" "service_load_balancer" {
  for_each = local.dns_services

  zone_id = data.aws_route53_zone.primary.id
  name    = each.value.domain
  type    = "A"

  alias {
    # technically, we don't need the 'dualstack' prefix, but AWS console
    # always adds it, so we do the same for consistency
    name                   = "dualstack.${each.value.lb.dns_name}"
    zone_id                = each.value.lb.zone_id
    evaluate_target_health = true
  }
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
