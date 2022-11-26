#pragma once

#include "DatabaseEntitiesTools.h"
#include "ReverseIndexItem.h"
#include "S3Path.h"

namespace comm {
namespace network {
namespace tools {

database::S3Path
generateS3Path(const std::string &bucketName, const std::string &blobHash);

std::string computeHashForFile(const database::S3Path &s3Path);

database::S3Path findS3Path(const std::string &holder);

database::S3Path findS3Path(const database::ReverseIndexItem &reverseIndexItem);

class invalid_argument_error : public std::runtime_error {
public:
  invalid_argument_error(std::string errorMessage)
      : std::runtime_error(errorMessage) {
  }
};

} // namespace tools
} // namespace network
} // namespace comm
