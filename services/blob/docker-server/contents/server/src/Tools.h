#pragma once

#include "DatabaseEntitiesTools.h"
#include "S3Path.h"

namespace comm {
namespace network {

// 4MB limit
// WARNING: use keeping in mind that grpc adds its own headers to messages
// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
// so the message that actually is being sent over the network looks like this
// [Compressed-Flag] [Message-Length] [Message]
//    [Compressed-Flag]   1 byte  - added by grpc
//    [Message-Length]    4 bytes - added by grpc
//    [Message]           N bytes - actual data
// so for every message we get 5 additional bytes of data
// as mentioned here
// https://github.com/grpc/grpc/issues/15734#issuecomment-396962671
// grpc stream may contain more than one message
const size_t GRPC_CHUNK_SIZE_LIMIT = 4 * 1024 * 1024;
const size_t GRPC_METADATA_SIZE_PER_MESSAGE = 5;
// 5MB limit
const size_t AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE = 5 * 1024 * 1024;

class Tools {
public:
  static Tools &getInstance() {
    static Tools instance;
    return instance;
  }

  database::S3Path
  generateS3Path(const std::string &bucketName, const std::string &blobHash);
  std::string computeHashForFile(const database::S3Path &s3Path);
  long long getCurrentTimestamp();
};

class invalid_argument_error : public std::runtime_error {
public:
  invalid_argument_error(std::string errorMessage)
      : std::runtime_error(errorMessage) {
  }
};

} // namespace network
} // namespace comm
