#include "RecoverBackupKeyReactor.h"

namespace comm {
namespace network {
namespace reactor {

std::unique_ptr<ServerBidiReactorStatus> RecoverBackupKeyReactor::handleRequest(
    backup::RecoverBackupKeyRequest request,
    backup::RecoverBackupKeyResponse *response) { // TODO handle request
  return std::make_unique<ServerBidiReactorStatus>(
      grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "unimplemented"));
}

} // namespace reactor
} // namespace network
} // namespace comm
