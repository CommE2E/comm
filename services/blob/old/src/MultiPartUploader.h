#pragma once

#include <aws/core/Aws.h>
#include <aws/s3/S3Client.h>
#include <aws/s3/model/CompleteMultipartUploadRequest.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

class MultiPartUploader {
  std::shared_ptr<Aws::S3::S3Client> client;
  const std::string bucketName;
  const std::string objectName;
  std::vector<size_t> partsSizes;

  Aws::S3::Model::CompleteMultipartUploadRequest completeMultipartUploadRequest;
  Aws::S3::Model::CompletedMultipartUpload completedMultipartUpload;
  std::string uploadId;

  size_t partNumber = 1;

public:
  MultiPartUploader(
      std::shared_ptr<Aws::S3::S3Client> client,
      const std::string bucketName,
      const std::string objectName);
  void addPart(const std::string &part);
  void finishUpload();
};

} // namespace network
} // namespace comm
