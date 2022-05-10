#pragma once

#include "Tools.h"

#include <string>

namespace comm {
namespace network {

// 5MB limit
const size_t AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE = 5 * 1024 * 1024;

const std::string BLOB_BUCKET_NAME = "commapp-blob";

const std::string BLOB_TABLE_NAME = decorateTableName("blob-service-blob");
const std::string REVERSE_INDEX_TABLE_NAME =
    decorateTableName("blob-service-reverse-index");

} // namespace network
} // namespace comm
