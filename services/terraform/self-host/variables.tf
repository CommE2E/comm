variable "domain_name" {
  description = "Domain name for your keyserver"
  type        = string
}

variable "region" {
  description = "The AWS region to deploy your keyserver in"
  type        = string
  default     = "us-west-1"
}

variable "allowed_ip" {
  description = "IP address"
  type        = string
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
