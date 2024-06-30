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

variable "identity_socket_address" {
  description = "The socket address to access the identity service"
  type        = string
  default     = "https://identity.commtechnologies.org:50054"
}

variable "db_instance_class" {
  description = "The instance class for the MariaDB RDS instance"
  type        = string
  default     = "db.t4g.medium"
}
