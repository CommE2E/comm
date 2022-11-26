#pragma once

#include <stdexcept>
#include <string>

namespace comm {
namespace network {
namespace database {

// S3 path format: [bucket name]/[object name]
class S3Path {
  std::string bucketName;
  std::string objectName;

public:
  S3Path();
  S3Path(const S3Path &other);
  S3Path &operator=(const S3Path &other);
  S3Path(const std::string bucketName, const std::string objectName);
  S3Path(const std::string fullPath);

  std::string getBucketName() const;
  std::string getObjectName() const;
  std::string getFullPath() const;
  void validate() const;
};

} // namespace database
} // namespace network
} // namespace comm
