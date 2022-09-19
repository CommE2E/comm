#include "./BlobClient.h"

namespace comm {
UploadBlobClient::UploadBlobClient() {
  this->uploadState = std::make_unique<::rust::Box<::UploadState>>(
      ::initialize_upload_state_blocking());
}

void UploadBlobClient::startUploadBlocking(
    const std::string &holder,
    const std::string &hash) {
  ::start_upload_blocking(*this->uploadState, holder, hash);
}

void UploadBlobClient::uploadChunkBlocking(
    std::uint8_t *chunk,
    size_t chunk_length) {
  ::upload_chunk_blocking(
      *this->uploadState,
      ::rust::Slice<const std::uint8_t>(chunk, chunk_length));
}

bool UploadBlobClient::completeUploadBlocking() {
  return ::complete_upload_blocking(std::move(*this->uploadState.release()));
}

UploadBlobClient::~UploadBlobClient() {
  if (this->uploadState) {
    ::complete_upload_blocking(std::move(*this->uploadState.release()));
  }
}
} // namespace comm
