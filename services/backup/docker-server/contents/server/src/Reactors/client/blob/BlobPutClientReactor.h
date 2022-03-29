#pragma once

#include "ClientBidiReactorBase.h"
#include "Constants.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <folly/MPMCQueue.h>
#include <grpcpp/grpcpp.h>

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

public:
  BlobPutClientReactor(const std::string &holder, const std::string &hash);
  void scheduleSendingDataChunk(const std::string &dataChunk);
  std::unique_ptr<grpc::Status> prepareRequest(
      blob::PutRequest &request,
      std::shared_ptr<blob::PutResponse> previousResponse) override;
};

BlobPutClientReactor::BlobPutClientReactor(
    const std::string &holder,
    const std::string &hash)
    : holder(holder),
      hash(hash),
      dataChunks(folly::MPMCQueue<std::string>(100)) {
}

void BlobPutClientReactor::scheduleSendingDataChunk(
    const std::string &dataChunk) {
  // TODO: we may be copying a big chunk of data, but `write` seems to only
  // accept `std::move`
  std::string str = std::string(dataChunk);
  if (!this->dataChunks.write(std::move(str))) {
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

} // namespace reactor
} // namespace network
} // namespace comm
