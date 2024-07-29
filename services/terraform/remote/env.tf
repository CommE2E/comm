resource "null_resource" "create_env_file" {
  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<EOT
      sops -d ${path.module}/.env.enc > ${path.module}/.env
    EOT
  }

  triggers = {
    # Trigger if the .env.enc file changes
    env_enc_checksum = filemd5("${path.module}/.env.enc")
    # Triggers if dev doesn't have the .env file decrypted from .env.enc
    env_not_exists = fileexists("${path.module}/.env")
  }
}

# Use null_resource to ensure the dotenv provider uses the file
data "dotenv" "local" {
  depends_on = [null_resource.create_env_file]
}
