#include "MultiPartUploader.h"
#include "Tools.h"

#include <aws/core/utils/HashingUtils.h>
#include <aws/s3/model/CreateMultipartUploadRequest.h>
#include <aws/s3/model/GetObjectRequest.h>
#include <aws/s3/model/Object.h>
#include <aws/s3/model/UploadPartRequest.h>

#include <boost/interprocess/streams/bufferstream.hpp>

namespace comm {
namespace network {

MultiPartUploader::MultiPartUploader(
    std::shared_ptr<Aws::S3::S3Client> client,
    const std::string bucketName,
    const std::string objectName)
    : client(client), bucketName(bucketName), objectName(objectName) {
  this->completeMultipartUploadRequest.SetBucket(this->bucketName);
  this->completeMultipartUploadRequest.SetKey(this->objectName);

  Aws::S3::Model::CreateMultipartUploadRequest createRequest;
  createRequest.SetBucket(this->bucketName);
  createRequest.SetKey(this->objectName);
  createRequest.SetContentType("application/octet-stream");

  Aws::S3::Model::CreateMultipartUploadOutcome createOutcome =
      this->client->CreateMultipartUpload(createRequest);

  if (!createOutcome.IsSuccess()) {
    throw std::runtime_error(createOutcome.GetError().GetMessage());
  }
  this->uploadId = createOutcome.GetResult().GetUploadId();
  this->completeMultipartUploadRequest.SetUploadId(this->uploadId);
}

void MultiPartUploader::addPart(const std::string &part) {
  Aws::S3::Model::UploadPartRequest uploadRequest;
  uploadRequest.SetBucket(this->bucketName);
  uploadRequest.SetKey(this->objectName);
  uploadRequest.SetPartNumber(this->partNumber);
  uploadRequest.SetUploadId(this->uploadId);

  std::shared_ptr<Aws::IOStream> body = std::shared_ptr<Aws::IOStream>(
      new boost::interprocess::bufferstream((char *)part.data(), part.size()));

  uploadRequest.SetBody(body);

  Aws::Utils::ByteBuffer partMd5(Aws::Utils::HashingUtils::CalculateMD5(*body));
  uploadRequest.SetContentMD5(Aws::Utils::HashingUtils::Base64Encode(partMd5));

  uploadRequest.SetContentLength(part.size());

  Aws::S3::Model::UploadPartOutcome uploadPartOutcome =
      this->client->UploadPart(uploadRequest);
  Aws::S3::Model::CompletedPart completedPart;
  completedPart.SetPartNumber(this->partNumber);
  std::string eTag = uploadPartOutcome.GetResult().GetETag();
  if (eTag.empty()) {
    throw std::runtime_error("etag empty");
  }
  completedPart.SetETag(eTag);
  this->completedMultipartUpload.AddParts(completedPart);
  ++this->partNumber;
}

void MultiPartUploader::finishUpload() {
  if (!this->completedMultipartUpload.PartsHasBeenSet()) {
    return;
  }
  this->completeMultipartUploadRequest.SetMultipartUpload(
      this->completedMultipartUpload);

  Aws::S3::Model::CompleteMultipartUploadOutcome completeUploadOutcome =
      this->client->CompleteMultipartUpload(
          this->completeMultipartUploadRequest);

  if (!completeUploadOutcome.IsSuccess()) {
    throw std::runtime_error(completeUploadOutcome.GetError().GetMessage());
  }
}

} // namespace network
} // namespace comm
