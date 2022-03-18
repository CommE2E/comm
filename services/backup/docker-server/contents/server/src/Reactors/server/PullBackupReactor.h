#pragma once

#include "AuthenticationManager.h"
#include "ServerBidiReactorBase.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class PullBackupReactor : public ServerBidiReactorBase<
                              backup::PullBackupRequest,
                              backup::PullBackupResponse> {
public:
  std::unique_ptr<grpc::Status> handleRequest(
      backup::PullBackupRequest request,
      backup::PullBackupResponse *response) override {
    // TODO handle request
    return std::make_unique<grpc::Status>(
        grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
