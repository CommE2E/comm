#pragma once

#include <blob.grpc.pb.h>
#include <blob.pb.h>

#include <ClientReadReactorBase.h>

#include <folly/MPMCQueue.h>
#include <grpcpp/grpcpp.h>

#include <condition_variable>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class BlobGetClientReactor
    : public ClientReadReactorBase<blob::GetRequest, blob::GetResponse> {
  std::string holder;
  std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks;
  std::condition_variable *terminationNotifier;

public:
  BlobGetClientReactor(
      const std::string &holder,
      std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks,
      std::condition_variable *terminationNotifier);

  std::unique_ptr<grpc::Status>
  readResponse(blob::GetResponse &response) override;
  void doneCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
