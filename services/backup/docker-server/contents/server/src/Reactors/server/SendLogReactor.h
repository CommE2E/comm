#pragma once

#include "ServerReadReactorBase.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class SendLogReactor : public ServerReadReactorBase<
                           backup::SendLogRequest,
                           google::protobuf::Empty> {

public:
  using ServerReadReactorBase<backup::SendLogRequest, google::protobuf::Empty>::
      ServerReadReactorBase;

  std::unique_ptr<grpc::Status>
  readRequest(backup::SendLogRequest request) override;
  void doneCallback() override;
};

std::unique_ptr<grpc::Status>
SendLogReactor::readRequest(backup::SendLogRequest request) {
  std::cout << "here handle request log chunk " << request.logdata().size()
            << std::endl;
  return nullptr;
}

void SendLogReactor::doneCallback() {
  std::cout << "receive logs done " << this->status.error_code() << "/"
            << this->status.error_message() << std::endl;
}

} // namespace reactor
} // namespace network
} // namespace comm
