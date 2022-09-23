resource "aws_ecr_repository" "identity" {
  name                 = "services/identity"
  image_tag_mutability = "MUTABLE"
}
