locals {
  root_domain = local.environment == "production" ? "commtechnologies.org" : "staging.commtechnologies.org"
}
