#include "S3Path.h"

#include <stdexcept>
#include <string>

namespace comm {
namespace network {
namespace database {

S3Path::S3Path() {}

S3Path::S3Path(const std::string bucketName, const std::string objectName)
    : bucketName(bucketName), objectName(objectName) {}

S3Path::S3Path(const std::string fullPath) {
  const size_t delimiterPos = fullPath.find('/');
  if (delimiterPos == std::string::npos) {
    std::string errorMessage = "invalid S3 path: ";
    errorMessage += fullPath;
    throw std::runtime_error(errorMessage);
  }
  this->bucketName = fullPath.substr(0, delimiterPos);
  this->objectName = fullPath.substr(delimiterPos + 1);
}

std::string S3Path::getBucketName() const {
  if (!this->bucketName.size()) {
    throw std::runtime_error("referencing S3 path with an empty bucket name");
  }
  return this->bucketName;
}

std::string S3Path::getObjectName() const {
  if (!this->bucketName.size()) {
    throw std::runtime_error("referencing S3 path with an empty object name");
  }
  return this->objectName;
}

std::string S3Path::getFullPath() const {
  return this->getBucketName() + "/" + this->getObjectName();
}

} // namespace database
} // namespace network
} // namespace comm
