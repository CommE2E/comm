variable "domain_name" {
  description = "Domain name for your keyserver"
  type        = string
}

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

variable "keyserver_username" {
  description = "Keyserver username"
  type        = string
}

variable "keyserver_password" {
  description = "Keyserver password"
  type        = string
  sensitive   = true
}

variable "using_identity_credentials" {
  description = "Whether to use identity credentials to login"
  type        = bool
  default     = false
}
