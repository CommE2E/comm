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
  this->setStatus(status);
  this->state = ReactorState::DONE;
  this->terminationNotifier->notify_one();
}

} // namespace reactor
} // namespace network
} // namespace comm
