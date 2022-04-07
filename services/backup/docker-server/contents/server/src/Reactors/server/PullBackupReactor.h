#pragma once

#include "ServerWriteReactorBase.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class PullBackupReactor : public ServerWriteReactorBase<
                              backup::PullBackupRequest,
                              backup::PullBackupResponse> {
public:
  using ServerWriteReactorBase<
      backup::PullBackupRequest,
      backup::PullBackupResponse>::ServerWriteReactorBase;

  std::unique_ptr<grpc::Status>
  writeResponse(backup::PullBackupResponse *response) override;
};

std::unique_ptr<grpc::Status>
PullBackupReactor::writeResponse(backup::PullBackupResponse *response) {
  // TODO handle request
  return std::make_unique<grpc::Status>(grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "unimplemented"));
}

} // namespace reactor
} // namespace network
} // namespace comm
