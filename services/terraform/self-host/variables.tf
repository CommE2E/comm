variable "mariadb_username" {
  description = "MariaDB username"
  type        = string
  sensitive   = true
}

variable "mariadb_password" {
  description = "MariaDB password"
  type        = string
  sensitive   = true
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

variable "availability_zone_1" {
  description = "First availability zone for vpc subnet"
  type        = string
  default     = "us-west-1b"
}

variable "availability_zone_2" {
  description = "Second availability zone for vpc subnet"
  type        = string
  default     = "us-west-1c"
}
