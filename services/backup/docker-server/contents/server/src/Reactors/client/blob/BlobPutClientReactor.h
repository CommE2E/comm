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
#include <thread>

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
  void doneCallback() override;
};

BlobPutClientReactor::BlobPutClientReactor(
    const std::string &holder,
    const std::string &hash)
    : holder(holder),
      hash(hash),
      dataChunks(folly::MPMCQueue<std::string>(20)) {
}

void BlobPutClientReactor::scheduleSendingDataChunk(
    const std::string &dataChunk) {
  // TODO: we may be copying a big chunk of data, but `write` seems to only
  // accept `std::move`
  std::cout << "[BC] here schedule sending data chunks 1: "
            << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << std::endl;
  std::string str = std::string(dataChunk);
  // std::cout << "here schedule sending data chunks 1.1" << std::endl;
  // std::unique_ptr<std::string> upt = std::make_unique<std::string>(str);
  // std::cout << "here schedule sending data chunks 1.2" << std::endl;
  if (!this->dataChunks.write(std::move(str))) {
    std::cout << "here schedule sending data chunks 2" << std::endl;
    throw std::runtime_error(
        "Error scheduling sending a data chunk to send to the blob service");
  }
  // this->dataChunks.blockingWrite(std::move(str));
  std::cout << "[BC] here schedule sending data chunks 3" << std::endl;
}

std::unique_ptr<grpc::Status> BlobPutClientReactor::prepareRequest(
    blob::PutRequest &request,
    std::shared_ptr<blob::PutResponse> previousResponse) {
  std::cout << "[BC] here blob put reactor entry" << std::endl;
  if (this->state == State::SEND_HOLDER) {
    std::cout << "[BC] here blob put reactor send holder" << std::endl;
    this->request.set_holder(this->holder);
    this->state = State::SEND_HASH;
    return nullptr;
  }
  if (this->state == State::SEND_HASH) {
    std::cout << "[BC] here blob put reactor send hash" << std::endl;
    request.set_blobhash(this->hash);
    this->state = State::SEND_CHUNKS;
    return nullptr;
  }
  std::cout << "[BC] here blob put reactor data chunks" << std::endl;
  if (previousResponse->dataexists()) {
    std::cout << "data exists - aborting" << std::endl;
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  std::cout << "[BC] data NOT exists - continue" << std::endl;
  std::string dataChunk;
  std::cout << "[BC] here blob put reactor waiting for a chunk: "
            << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << std::endl;
  this->dataChunks.blockingRead(dataChunk);
  std::cout << "[BC] read from the queue " << dataChunk.size() << std::endl;
  if (dataChunk.empty()) {
    std::cout << "[BC] empty message - terminating " << dataChunk.size()
              << std::endl;
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  request.set_datachunk(dataChunk);
  return nullptr;
}

void BlobPutClientReactor::doneCallback() {
  std::cout << "[BC] blob put client done " << this->status.error_code() << "/"
            << this->status.error_message() << std::endl;
}

} // namespace reactor
} // namespace network
} // namespace comm
