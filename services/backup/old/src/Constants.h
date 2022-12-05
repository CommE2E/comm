#pragma once

#include "GlobalTools.h"
#include "Tools.h"

#include <string>

namespace comm {
namespace network {

const std::string LOG_TABLE_NAME =
    tools::decorateTableName("backup-service-log");
const std::string BACKUP_TABLE_NAME =
    tools::decorateTableName("backup-service-backup");

// This has to be smaller than GRPC_CHUNK_SIZE_LIMIT because we need to
// recognize if we may receive multiple chunks or just one. If it was larger
// than the chunk limit, once we get the amount of data of size equal to the
// limit, we wouldn't know if we should put this in the database right away or
// wait for more data.
// 400KiB limit (in docs there is KB but they mean KiB) -
// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
const size_t LOG_DATA_SIZE_DATABASE_LIMIT = 1024 * 400;

} // namespace network
} // namespace comm
