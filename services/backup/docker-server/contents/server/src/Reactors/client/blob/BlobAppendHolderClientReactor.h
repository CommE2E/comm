#pragma once

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class BlobAppendHolderClientReactor : public grpc::ClientUnaryReactor {
  bool done = false;
  grpc::Status status = grpc::Status::OK;
  std::condition_variable *terminationNotifier;

public:
  grpc::ClientContext context;
  blob::AppendHolderRequest request;
  google::protobuf::Empty response;

  BlobAppendHolderClientReactor(
      const std::string &holder,
      const std::string &hash,
      std::condition_variable *terminationNotifier)
      : terminationNotifier(terminationNotifier) {
    this->request.set_holder(holder);
    this->request.set_blobhash(hash);
  }

  void OnDone(const grpc::Status &status) {
    this->status = status;
    this->done = true;
    this->terminationNotifier->notify_one();
  }

  bool isDone() const {
    return this->done;
  }

  grpc::Status getStatus() const {
    return this->status;
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
