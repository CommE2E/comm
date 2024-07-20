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
  description = "The AWS region to deploy your keyserver in"
  type        = string
  default     = "us-west-1"
}

variable "allowed_ips" {
  description = "List of allowed ipv4 addresses"
  type        = list(string)
}

variable "user_created_vpc" {
  description = "Use non-default vpc and subnets"
}

variable "availability_zone_1" {
  description = "First availability zone for vpc subnet if user created vpc"
  type        = string
  default     = "us-west-1b"
}

variable "availability_zone_2" {
  description = "Second availability zone for vpc subnet if user created vpc"
  type        = string
  default     = "us-west-1c"
}

variable "db_instance_class" {
  description = "The instance class for the MariaDB RDS instance"
  type        = string
  default     = "db.t4g.medium"
}

variable "desired_secondary_nodes" {
  description = "Desired number of secondary nodes"
  type        = number
  default     = 1
}
