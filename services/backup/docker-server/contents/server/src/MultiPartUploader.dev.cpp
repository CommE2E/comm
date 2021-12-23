#include "MultiPartUploader.h"
#include "AwsS3Bucket.h"
#include "DevTools.h"
#include "Tools.h"

#include <memory>

namespace comm {
namespace network {

std::unique_ptr<AwsS3Bucket> bucket;

MultiPartUploader::MultiPartUploader(
    std::shared_ptr<Aws::S3::S3Client> client,
    const std::string bucketName,
    const std::string objectName)
    : client(nullptr), bucketName(bucketName), objectName(objectName) {
  bucket->writeObject(createCommPath(this->objectName), "");
}

void MultiPartUploader::addPart(const std::string &part) {
  AwsS3Bucket(bucketName, nullptr)
      .appendToObject(createCommPath(this->objectName + "mpu"), part);
  this->partsSizes.push_back(part.size());
  ++this->partCounter;
}

void MultiPartUploader::finishUpload() {
  AwsS3Bucket bucket(bucketName, nullptr);
  for (size_t i = 0; i < this->partsSizes.size() - 1; ++i) {
    if (this->partsSizes.at(i) < AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
      bucket.deleteObject(createCommPath(this->objectName + "mpu"));
      throw std::runtime_error("too small part detected");
    }
  }
  bucket.renameObject(
      createCommPath(this->objectName + "mpu"),
      createCommPath(this->objectName));
}

} // namespace network
} // namespace comm
