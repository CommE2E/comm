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

variable "user_created_vpc" {
  description = "Use non-default vpc and subnets"
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

variable "authoritative_keyserver_user_id" {
  description = "Authoritative keyserver user id"
  type        = string
}

variable "using_identity_credentials" {
  description = "Whether to use identity credentials to login"
  type        = bool
  default     = false
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

variable "identity_socket_address" {
  description = "The socket address to access the identity service"
  type        = string
  default     = "https://identity.commtechnologies.org:50054"
}

variable "tunnelbroker_url" {
  description = "The address to access the tunnelbroker service"
  type        = string
  default     = "wss://tunnelbroker.commtechnologies.org:51001"
}

variable "db_instance_class" {
  description = "The instance class for the MariaDB RDS instance"
  type        = string
  default     = "db.t4g.medium"
}
