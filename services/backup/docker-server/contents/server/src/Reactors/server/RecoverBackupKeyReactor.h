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

class RecoverBackupKeyReactor : public ServerBidiReactorBase<
                                    backup::RecoverBackupKeyRequest,
                                    backup::RecoverBackupKeyResponse> {
public:
  std::unique_ptr<grpc::Status> handleRequest(
      backup::RecoverBackupKeyRequest request,
      backup::RecoverBackupKeyResponse *response)
      override { // TODO handle request
    return std::make_unique<grpc::Status>(
        grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
