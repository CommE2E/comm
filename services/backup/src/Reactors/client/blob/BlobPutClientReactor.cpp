#include "BlobPutClientReactor.h"

#include <iostream>

namespace comm {
namespace network {
namespace reactor {

BlobPutClientReactor::BlobPutClientReactor(
    const std::string &holder,
    const std::string &hash,
    std::condition_variable *terminationNotifier)
    : holder(holder),
      hash(hash),
      dataChunks(folly::MPMCQueue<std::string>(100)),
      terminationNotifier(terminationNotifier) {
}

void BlobPutClientReactor::scheduleSendingDataChunk(
    std::unique_ptr<std::string> dataChunk) {
  if (!this->dataChunks.write(std::move(*dataChunk))) {
    throw std::runtime_error(
        "Error scheduling sending a data chunk to send to the blob service");
  }
}

std::unique_ptr<grpc::Status> BlobPutClientReactor::prepareRequest(
    blob::PutRequest &request,
    std::shared_ptr<blob::PutResponse> previousResponse) {
  if (this->state == State::SEND_HOLDER) {
    this->request.set_holder(this->holder);
    this->state = State::SEND_HASH;
    return nullptr;
  }
  if (this->state == State::SEND_HASH) {
    request.set_blobhash(this->hash);
    this->state = State::SEND_CHUNKS;
    return nullptr;
  }
  if (previousResponse->dataexists()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  std::string dataChunk;
  this->dataChunks.blockingRead(dataChunk);
  if (dataChunk.empty()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  request.set_datachunk(dataChunk);
  return nullptr;
}

void BlobPutClientReactor::doneCallback() {
  this->terminationNotifier->notify_one();
}

} // namespace reactor
} // namespace network
} // namespace comm
