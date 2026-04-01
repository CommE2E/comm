output "service_load_balancer_dns_name" {
  value = var.service_enabled ? aws_lb.service[0].dns_name : null
}
