#pragma once

#include "ClientReadReactorBase.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <folly/MPMCQueue.h>
#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class BlobGetClientReactor
    : public ClientReadReactorBase<blob::GetRequest, blob::GetResponse> {
  std::string holder;
  std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks;

public:
  BlobGetClientReactor(
      const std::string &holder,
      std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks);

  std::unique_ptr<grpc::Status>
  readResponse(blob::GetResponse &response) override;
  void doneCallback() override;
};

BlobGetClientReactor::BlobGetClientReactor(
    const std::string &holder,
    std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks)
    : holder(holder), dataChunks(dataChunks) {
}

std::unique_ptr<grpc::Status>
BlobGetClientReactor::readResponse(blob::GetResponse &response) {
  if (!this->dataChunks->write(std::move(*response.mutable_datachunk()))) {
    throw std::runtime_error(
        "error reading compaction data from the blob service");
  }
  return nullptr;
}

void BlobGetClientReactor::doneCallback() {
  this->dataChunks->write("");
}

} // namespace reactor
} // namespace network
} // namespace comm
