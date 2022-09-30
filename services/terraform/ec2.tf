resource "aws_instance" "identity_service" {
  ami           = "ami-0f924dc71d44d23e2"
  instance_type = "t2.micro"
  tags = {
    Name = "identity_service"
  }
}
