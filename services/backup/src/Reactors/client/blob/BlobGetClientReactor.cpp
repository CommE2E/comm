
#include "BlobGetClientReactor.h"

namespace comm {
namespace network {
namespace reactor {

BlobGetClientReactor::BlobGetClientReactor(
    const std::string &holder,
    std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks,
    std::condition_variable *terminationNotifier)
    : holder(holder),
      dataChunks(dataChunks),
      terminationNotifier(terminationNotifier) {
}

std::unique_ptr<grpc::Status>
BlobGetClientReactor::readResponse(blob::GetResponse &response) {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobGetClientReactor::readResponse] data chunk size "
            << response.datachunk().size();
  if (!this->dataChunks->write(std::move(*response.mutable_datachunk()))) {
    throw std::runtime_error("error reading data from the blob service");
  }
  return nullptr;
}

void BlobGetClientReactor::doneCallback() {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobGetClientReactor::doneCallback]";
  this->dataChunks->write("");
  this->terminationNotifier->notify_one();
}

} // namespace reactor
} // namespace network
} // namespace comm
