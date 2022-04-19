
#include "BlobGetClientReactor.h"

namespace comm {
namespace network {
namespace reactor {

BlobGetClientReactor::BlobGetClientReactor(
    const std::string &holder,
    std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks)
    : holder(holder), dataChunks(dataChunks) {
}

std::unique_ptr<grpc::Status>
BlobGetClientReactor::readResponse(blob::GetResponse &response) {
  if (!this->dataChunks->write(std::move(*response.mutable_datachunk()))) {
    throw std::runtime_error("error reading data from the blob service");
  }
  return nullptr;
}

void BlobGetClientReactor::doneCallback() {
  this->dataChunks->write("");
}

grpc::Status BlobGetClientReactor::getStatus() const {
  return this->status;
}

} // namespace reactor
} // namespace network
} // namespace comm
