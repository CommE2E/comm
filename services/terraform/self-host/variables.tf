variable "keyserver_domain_name" {
  description = "Domain name for your keyserver"
  type        = string
}

variable "landing_domain_name" {
  description = "Domain name for your landing page"
  type        = string
}

variable "webapp_domain_name" {
  description = "Domain name for your web app"
  type        = string
}

variable "region" {
  description = "Keyserver's AWS deployment region"
  type        = string
  default     = "us-west-1"
}

variable "allowed_ips" {
  description = "List of IPv4 addresses always allowed access to keyserver load balancer and MariaDB"
  type        = list(string)
}

variable "user_created_vpc" {
  description = "Use non-default vpc and subnets"
  default     = false
}

variable "availability_zone_1" {
  description = "First availability zone for vpc subnet if user-created vpc"
  type        = string
  default     = "us-west-1b"
}

variable "availability_zone_2" {
  description = "Second availability zone for vpc subnet if user-created vpc"
  type        = string
  default     = "us-west-1c"
}

variable "db_instance_class" {
  description = "The instance class for MariaDB RDS"
  type        = string
  default     = "db.t4g.medium"
}

variable "desired_secondary_nodes" {
  description = "Desired number of secondary nodes"
  type        = number
  default     = 1
}

variable "custom_keyserver_image" {
  description = "Specify custom keyserver image. Should be reserved for development purposes"
  type        = string
  default     = null
}
