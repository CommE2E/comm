resource "aws_instance" "identity_service" {
  ami           = "ami-0f924dc71d44d23e2"
  instance_type = "t2.micro"
  tags = {
    Name = "identity_service"
  }
}

resource "aws_instance" "blob_service" {
  ami           = "ami-0f924dc71d44d23e2"
  instance_type = "t2.micro"
  tags = {
    Name = "blob_service"
  }
}

resource "aws_instance" "backup_service" {
  ami           = "ami-0f924dc71d44d23e2"
  instance_type = "t2.micro"
  tags = {
    Name = "backup_service"
  }
}

resource "aws_instance" "tunnelbroker_service" {
  ami           = "ami-0f924dc71d44d23e2"
  instance_type = "t2.micro"
  tags = {
    Name = "tunnelbroker_service"
  }
}
