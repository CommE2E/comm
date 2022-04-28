#pragma once

#include "Tools.h"

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

const std::string LOG_TABLE_NAME = decorateTableName("backup-service-log");
const std::string BACKUP_TABLE_NAME =
    decorateTableName("backup-service-backup");

// This has to be smaller than GRPC_CHUNK_SIZE_LIMIT because we need to
// recognize if we may receive multiple chunks or just one. If it was larger
// than the chunk limit, once we get the amount of data of size equal to the
// limit, we wouldn't know if we should put this in the database right away or
// wait for more data.
const size_t LOG_DATA_SIZE_DATABASE_LIMIT = 1 * 1024 * 1024;

} // namespace network
} // namespace comm
