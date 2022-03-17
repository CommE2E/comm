#pragma once

#include "AuthenticationManager.h"
#include "ServerReadReactorBase.h"

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
    AUTHENTICATION = 1,
    RECEIVING_LOGS = 2,
  };

  auth::AuthenticationManager authenticationManager;
  State state = State::AUTHENTICATION;

public:
  using ServerReadReactorBase<backup::SendLogRequest, google::protobuf::Empty>::
      ServerReadReactorBase;
  std::unique_ptr<grpc::Status>
  readRequest(backup::SendLogRequest request) override {
    std::cout << "here send log enter" << std::endl;
    switch (this->state) {
      case State::AUTHENTICATION: {
        std::cout << "here send log auth" << std::endl;
        if (!this->authenticationManager.performSimpleAuthentication(
                request.authenticationdata())) {
          throw std::runtime_error("simple authentication failed");
        }
        this->state = State::RECEIVING_LOGS;
        return nullptr;
      }
      case State::RECEIVING_LOGS: {
        std::cout << "here handle request log chunk "
                  << request.logdata().size() << std::endl;
        return nullptr;
      }
    }
    throw std::runtime_error("send log - invalid state");
  }

  void doneCallback() override {
    std::cout << "receive logs done " << this->status.error_code() << "/"
              << this->status.error_message() << std::endl;
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
