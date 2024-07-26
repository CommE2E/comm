output "keyserver_service_load_balancer_dns_name" {
  value = aws_lb.keyserver_service.dns_name
}

output "webapp_service_load_balancer_dns_name" {
  value = var.enable_webapp_service ? module.webapp_service[0].service_load_balancer_dns_name : ""
}
