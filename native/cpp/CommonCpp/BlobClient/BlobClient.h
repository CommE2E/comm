#include "lib.rs.h"

#include <memory>
#include <string>

namespace comm {
class UploadBlobClient {
  std::unique_ptr<::rust::Box<::UploadState>> uploadState;

public:
  UploadBlobClient();
  void startUploadBlocking(const std::string &holder, const std::string &hash);
  void uploadChunkBlocking(std::uint8_t *chunk, size_t chunk_length);
  bool completeUploadBlocking();
  ~UploadBlobClient();
};
} // namespace comm
