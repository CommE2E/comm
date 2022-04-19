#pragma once

#include "ServerBidiReactorBase.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <memory>

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

} // namespace reactor
} // namespace network
} // namespace comm
