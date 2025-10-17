variable "create_resources" {
  description = "Whether to create auto-scaling resources"
  type        = bool
  default     = true
}

variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 8
}

variable "cpu_target" {
  description = "Target CPU utilization percentage"
  type        = number
  default     = 30.0

  validation {
    condition     = var.cpu_target > 0 && var.cpu_target <= 100
    error_message = "CPU target must be between 0 and 100."
  }
}

variable "memory_target" {
  description = "Target memory utilization percentage"
  type        = number
  default     = 40.0

  validation {
    condition     = var.memory_target > 0 && var.memory_target <= 100
    error_message = "Memory target must be between 0 and 100."
  }
}

variable "scale_in_cooldown" {
  description = "Cooldown period (in seconds) before scaling down"
  type        = number
  default     = 300
}

variable "scale_out_cooldown" {
  description = "Cooldown period (in seconds) before scaling up"
  type        = number
  default     = 60
}