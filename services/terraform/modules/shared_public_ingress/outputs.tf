output "load_balancer_dns_name" {
  value = (
    length(aws_lb.public_ingress) > 0
    ? aws_lb.public_ingress[0].dns_name
    : null
  )
}

output "load_balancer_zone_id" {
  value = (
    length(aws_lb.public_ingress) > 0
    ? aws_lb.public_ingress[0].zone_id
    : null
  )
}

output "public_ingress_security_group_id" {
  value = (
    length(aws_security_group.public_ingress) > 0
    ? aws_security_group.public_ingress[0].id
    : null
  )
}

output "target_group_arns" {
  value = {
    for endpoint_name, target_group in aws_lb_target_group.endpoint :
    endpoint_name => target_group.arn
  }
}
