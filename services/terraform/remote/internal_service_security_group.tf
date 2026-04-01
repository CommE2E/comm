resource "aws_security_group" "comm_services_internal" {
  name        = "comm-services-internal-sg"
  description = "Shared internal security group for remote ECS services"
  vpc_id      = aws_vpc.default.id

  ingress {
    description = "Allow traffic between remote ECS services"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
