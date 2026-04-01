variable "create_resources" {
  description = "Whether to provision the shared public ingress resources"
  type        = bool
  default     = true
}

variable "load_balancer_name" {
  description = "Shared public load balancer name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the shared ALB and managed target groups"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the shared ALB"
  type        = list(string)
}

variable "endpoints" {
  description = "Public ingress endpoints keyed by endpoint name"
  type = map(object({
    enabled                                       = bool
    hostname                                      = string
    listener_port                                 = number
    certificate_domain                            = string
    ssl_policy                                    = string
    target_group_name                             = string
    target_group_arn                              = string
    target_group_port                             = number
    target_group_protocol                         = string
    target_group_protocol_version                 = string
    target_group_health_check_protocol            = string
    target_group_health_check_port                = string
    target_group_health_check_path                = string
    target_group_health_check_matcher             = string
    target_group_health_check_healthy_threshold   = number
    target_group_health_check_unhealthy_threshold = number
    target_group_stickiness_enabled               = bool
    target_group_stickiness_type                  = string
    target_group_stickiness_cookie_duration       = number
  }))
}
