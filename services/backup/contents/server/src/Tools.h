#include <exception>

namespace comm {
namespace network {

// 4MB limit
const size_t GRPC_CHUNK_SIZE_LIMIT = 4 * 1024 * 1024;

// 5MB limit
const size_t AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE = 5 * 1024 * 1024;

enum class OBJECT_TYPE {
  ENCRYPTED_BACKUP_KEY = 0,
  TRANSACTION_LOGS = 1,
  COMPACTION = 2,
};

} // namespace network
} // namespace comm
