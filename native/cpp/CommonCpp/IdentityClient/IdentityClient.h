#include "lib.rs.h"

#include <memory>
#include <string>

namespace comm {
class IdentityClient {
  std::unique_ptr<::rust::Box<::Client>> client;
public:
    
    IdentityClient();
  // void startUploadBlocking(const std::string &holder, const std::string &hash);
  // void uploadChunkBlocking(std::uint8_t *chunk, size_t chunk_length);
  // bool completeUploadBlocking();
  // ~UploadBlobClient();
};
} // namespace comm
