locals {
  dns_services = {
    Blob = {
      domain = local.blob_service_domain_name
      lb     = aws_lb.blob_service
    },
    Backup = {
      domain = local.backup_service_domain_name
      lb     = aws_lb.backup_service
    },
    ElectronUpdate = {
      domain = local.electron_update_domain_name
      lb     = aws_lb.electron_update
    },
    FeatureFlags = {
      domain = local.feature_flags_domain_name
      lb     = aws_lb.feature_flags
    },
    Identity = {
      domain = local.identity_service_domain_name
      lb     = aws_lb.identity_service
    },
    Reports = {
      domain = local.reports_service_domain_name
      lb     = aws_lb.reports_service
    },
    Tunnelbroker = {
      domain = local.tunnelbroker_config.domain_name
      lb     = aws_lb.tunnelbroker
    },
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
    zone_id                = data.aws_route53_zone.primary.id
    evaluate_target_health = true
  }
}
