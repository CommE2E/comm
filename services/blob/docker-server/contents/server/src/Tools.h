#pragma once

#include <exception>

#include "DatabaseEntities.h"
#include "DatabaseManager.h"

namespace comm {
namespace network {

// 4MB limit
const size_t GRPC_CHUNK_SIZE_LIMIT = 4 * 1024 * 1024;
// 5MB limit
const size_t AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE = 5 * 1024 * 1024;

class Tools {
public:
  static Tools &getInstance() {
    static Tools instance;
    return instance;
  }

  database::S3Path generateS3Path(const std::string &bucketName,
                                  const std::string &fileHash);
  std::string computeHashForFile(const database::S3Path &s3Path);
  database::S3Path findS3Path(const std::string &reverseIndex);
};

} // namespace network
} // namespace comm
