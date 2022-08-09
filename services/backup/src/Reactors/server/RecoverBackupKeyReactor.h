#pragma once

#include "ServerBidiReactorBase.h"

#include "backup.grpc.pb.h"
#include "backup.pb.h"

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class RecoverBackupKeyReactor : public ServerBidiReactorBase<
                                    backup::RecoverBackupKeyRequest,
                                    backup::RecoverBackupKeyResponse> {
public:
  std::unique_ptr<ServerBidiReactorStatus> handleRequest(
      backup::RecoverBackupKeyRequest request,
      backup::RecoverBackupKeyResponse *response);
};

std::unique_ptr<ServerBidiReactorStatus> RecoverBackupKeyReactor::handleRequest(
    backup::RecoverBackupKeyRequest request,
    backup::RecoverBackupKeyResponse *response) { // TODO handle request
  return std::make_unique<ServerBidiReactorStatus>(
      grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "unimplemented"));
}

} // namespace reactor
} // namespace network
} // namespace comm
