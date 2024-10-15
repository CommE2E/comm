locals {
  keyserver_image_tag = "1.0.133"
  keyserver_image     = "commapp/keyserver:${local.keyserver_image_tag}"

  shared_keyserver_environment_vars = {
    "COMM_LISTEN_ADDR" = "0.0.0.0",
  }

  webapp_landing_environment_vars = local.secrets["webappLandingEnvVars"]

  webapp_landing_environment_vars_encoded = {
    for key, value in local.webapp_landing_environment_vars : key => jsonencode(value)
  }

  stage_specific_environment_vars = (local.is_staging ?
    local.secrets["webappLandingStagingEnvVars"] :
  local.secrets["webappLandingProdEnvVars"])

  stage_specific_environment_vars_encoded = {
    for key, value in local.stage_specific_environment_vars : key => jsonencode(value)
  }
}
