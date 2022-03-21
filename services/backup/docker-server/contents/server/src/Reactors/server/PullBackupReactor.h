#pragma once

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
      backup::PullBackupResponse *response) override;
};

std::unique_ptr<grpc::Status> PullBackupReactor::handleRequest(
    backup::PullBackupRequest request,
    backup::PullBackupResponse *response) {
  // TODO handle request
  return std::make_unique<grpc::Status>(
      grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
}

} // namespace reactor
} // namespace network
} // namespace comm
