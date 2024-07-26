# AWS Deployment Configuration Options

variable "region" {
  description = "The AWS region"
  type        = string
}

variable "vpc_id" {
  description = "The VPC ID"
  type        = string
}

variable "vpc_subnets" {
  description = "List of VPC subnet IDs"
  type        = list(string)
}

variable "cluster_id" {
  description = "id of ecs cluster"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "The ARN of the ECS task role"
  type        = string
}

variable "ecs_task_execution_role_arn" {
  description = "The ARN of the ECS task execution role"
  type        = string
}

# Service Options

variable "service_name" {
  description = "The name of the ECS service"
  type        = string
}

variable "domain_name" {
  description = "The domain name for the load balancer certificate"
  type        = string
}

variable "container_name" {
  description = "The name of the container"
  type        = string
}


variable "desired_count" {
  description = "Desired number of running nodes"
  type        = number
  # default 2 for constant uptime
  default = 2
}

variable "image" {
  description = "The Docker image for the container"
  type        = string
}

variable "environment_vars" {
  description = "Map of environment variables to be initialized in container"
  type        = map(string)
}

# Task resources
variable "cpu" {
  description = "CPU units allocated to each task"
  type        = number
  default     = 2048
}

variable "memory" {
  description = "Memory allocated to each task in MiB"
  type        = number
  default     = 4096
}

variable "ephemeral_storage" {
  description = "Ephemeral storage dedicated to task in GiB"
  type        = number
  default     = 40
}
