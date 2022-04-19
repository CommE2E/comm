#pragma once

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>
#include <condition_variable>

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
      std::condition_variable *terminationNotifier);
  void OnDone(const grpc::Status &status);
  bool isDone() const;
  grpc::Status getStatus() const;
};

} // namespace reactor
} // namespace network
} // namespace comm
