resource "aws_secretsmanager_secret" "services_token" {
  name        = "servicesToken"
  description = "Service-to-service access token"
}
resource "aws_secretsmanager_secret_version" "services_token" {
  secret_id      = aws_secretsmanager_secret.services_token.id
  secret_string  = var.is_dev ? "super-secret" : random_password.services_token.result
  version_stages = ["AWSCURRENT"]
}

# Now we generate a random password for the services token in production
# until we have rotation configured.
resource "random_password" "services_token" {
  length           = 32
  special          = true
  override_special = "!#$%&*-_=+<>?"
}

output "services_token_id" {
  value = aws_secretsmanager_secret.services_token.id
}
