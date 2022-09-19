#include "lib.rs.h"

#include <memory>
#include <string>
#include <tuple>
#include <vector>

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

class DownloadBlobClient {
  std::unique_ptr<::rust::Box<::DownloadState>> downloadState;

public:
  DownloadBlobClient(const std::string &holder);
  std::tuple<bool, std::vector<std::uint8_t>> pullChunkBlocking();
};
} // namespace comm