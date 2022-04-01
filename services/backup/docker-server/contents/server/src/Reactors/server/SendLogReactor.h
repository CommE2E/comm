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
  enum class State {
    USER_ID = 1,
    LOG_CHUNK = 2,
  };

  State state = State::USER_ID;
  std::string userID;

public:
  using ServerReadReactorBase<backup::SendLogRequest, google::protobuf::Empty>::
      ServerReadReactorBase;

  std::unique_ptr<grpc::Status>
  readRequest(backup::SendLogRequest request) override;
  void doneCallback() override;
};

std::unique_ptr<grpc::Status>
SendLogReactor::readRequest(backup::SendLogRequest request) {
  // TODO implement
  switch (this->state) {
    case State::USER_ID: {
      if (!request.has_userid()) {
        throw std::runtime_error("user id expected but not received");
      }
      this->userID = request.userid();
      this->state = State::LOG_CHUNK;
      return nullptr;
    };
    case State::LOG_CHUNK: {
      if (!request.has_logdata()) {
        throw std::runtime_error("log data expected but not received");
      }
      std::string chunk = request.logdata();
      std::cout << "log data received " << chunk << std::endl;
    };
  }
  throw std::runtime_error("send log - invalid state");
}

void SendLogReactor::doneCallback() {
  // TODO implement
  std::cout << "receive logs done " << this->status.error_code() << "/"
            << this->status.error_message() << std::endl;
}

} // namespace reactor
} // namespace network
} // namespace comm
