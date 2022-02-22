#pragma once

#include <string>

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

const std::string AWS_REGION = "us-east-2";

#ifdef COMM_TEST_SERVICES
const std::string LOG_TABLE_NAME = "backup-service-log-test";
const std::string BACKUP_TABLE_NAME = "backup-service-backup-test";
#else
const std::string LOG_TABLE_NAME = "backup-service-log";
const std::string BACKUP_TABLE_NAME = "backup-service-backup";
#endif

} // namespace network
} // namespace comm
