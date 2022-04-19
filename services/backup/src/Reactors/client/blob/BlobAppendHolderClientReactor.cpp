#include "BlobAppendHolderClientReactor.h"

namespace comm {
namespace network {
namespace reactor {

BlobAppendHolderClientReactor::BlobAppendHolderClientReactor(
    const std::string &holder,
    const std::string &hash,
    std::condition_variable *terminationNotifier)
    : terminationNotifier(terminationNotifier) {
  this->request.set_holder(holder);
  this->request.set_blobhash(hash);
}

void BlobAppendHolderClientReactor::OnDone(const grpc::Status &status) {
  this->status = status;
  this->done = true;
  this->terminationNotifier->notify_one();
}

bool BlobAppendHolderClientReactor::isDone() const {
  return this->done;
}

grpc::Status BlobAppendHolderClientReactor::getStatus() const {
  return this->status;
}

} // namespace reactor
} // namespace network
} // namespace comm
