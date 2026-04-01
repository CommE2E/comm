locals {
  fixed_count_service_desired_counts = {
    webapp          = 0
    landing         = 0
    feature_flags   = 0
    electron_update = 0
    reports         = 1
  }

  autoscaled_service_capacities = {
    backup = {
      min_capacity = 1
      max_capacity = 4
    }
    blob = {
      min_capacity = 1
      max_capacity = 4
    }
    identity = {
      min_capacity = 1
      max_capacity = 6
    }
    tunnelbroker = {
      min_capacity = 1
      max_capacity = 8
    }
  }

  service_enabled = merge(
    {
      for service_name, desired_count in local.fixed_count_service_desired_counts :
      service_name => desired_count > 0
    },
    {
      for service_name, capacity in local.autoscaled_service_capacities :
      service_name => (
        capacity.min_capacity > 0 || capacity.max_capacity > 0
      )
    },
  )

  tunnelbroker_grpc_service_enabled = (
    local.service_enabled.tunnelbroker && local.is_staging
  )

  off_aws_service_a_record_ips = {
    ElectronUpdate = "64.62.211.132"
  }
}
