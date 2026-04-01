output "service_load_balancer_dns_name" {
  value = (
    local.dedicated_ingress_enabled ? aws_lb.service[0].dns_name : null
  )
}
