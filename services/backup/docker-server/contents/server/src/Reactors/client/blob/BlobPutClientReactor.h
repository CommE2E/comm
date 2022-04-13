#pragma once

#include "ClientBidiReactorBase.h"
#include "Constants.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <folly/MPMCQueue.h>
#include <grpcpp/grpcpp.h>

#include <condition_variable>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class BlobPutClientReactor
    : public ClientBidiReactorBase<blob::PutRequest, blob::PutResponse> {

  enum class State {
    SEND_HOLDER = 0,
    SEND_HASH = 1,
    SEND_CHUNKS = 2,
  };

  State state = State::SEND_HOLDER;
  const std::string hash;
  const std::string holder;
  size_t currentDataSize = 0;
  const size_t chunkSize =
      GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE;
  folly::MPMCQueue<std::string> dataChunks;
  std::condition_variable *terminationNotifier;

public:
  BlobPutClientReactor(
      const std::string &holder,
      const std::string &hash,
      std::condition_variable *terminationNotifier);
  void scheduleSendingDataChunk(std::unique_ptr<std::string> dataChunk);
  std::unique_ptr<grpc::Status> prepareRequest(
      blob::PutRequest &request,
      std::shared_ptr<blob::PutResponse> previousResponse) override;
  void doneCallback() override;
  grpc::Status getStatus() const;
};

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

grpc::Status BlobPutClientReactor::getStatus() const {
  return this->status;
}

} // namespace reactor
} // namespace network
} // namespace comm
