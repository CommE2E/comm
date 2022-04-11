variable "s3_bucket_names" {
  type = list
  default = [
    "commapp-blob",
  ]
}

resource "aws_s3_bucket" "comm_buckets" {
  count = length(var.s3_bucket_names)
  bucket = var.s3_bucket_names[count.index]
}
