#include "BlobPutClientReactor.h"

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
  LOG(INFO)
      << "[BlobPutClientReactor::scheduleSendingDataChunk] data chunk size "
      << dataChunk->size();
  if (!this->dataChunks.write(std::move(*dataChunk))) {
    throw std::runtime_error(
        "Error scheduling sending a data chunk to send to the blob service");
  }
}

std::unique_ptr<grpc::Status> BlobPutClientReactor::prepareRequest(
    blob::PutRequest &request,
    std::shared_ptr<blob::PutResponse> previousResponse) {
  LOG(INFO) << "[BlobPutClientReactor::prepareRequest]";
  if (this->state == State::SEND_HOLDER) {
    this->request.set_holder(this->holder);
    LOG(INFO) << "[BlobPutClientReactor::prepareRequest] holder "
              << this->holder;
    this->state = State::SEND_HASH;
    return nullptr;
  }
  if (this->state == State::SEND_HASH) {
    request.set_blobhash(this->hash);
    LOG(INFO) << "[BlobPutClientReactor::prepareRequest] hash " << this->hash;
    this->state = State::SEND_CHUNKS;
    return nullptr;
  }
  LOG(INFO) << "[BlobPutClientReactor::prepareRequest] data exists "
            << previousResponse->dataexists();
  if (previousResponse->dataexists()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  std::string dataChunk;
  LOG(INFO) << "[BlobPutClientReactor::prepareRequest] reading data chunk";
  this->dataChunks.blockingRead(dataChunk);
  LOG(INFO) << "[BlobPutClientReactor::prepareRequest] read data chunk "
            << dataChunk.size();
  if (dataChunk.empty()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  request.set_datachunk(dataChunk);
  return nullptr;
}

void BlobPutClientReactor::doneCallback() {
  LOG(INFO) << "[BlobPutClientReactor::doneCallback]";
  this->terminationNotifier->notify_one();
}

} // namespace reactor
} // namespace network
} // namespace comm
