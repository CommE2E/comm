#pragma once

#include "AuthenticationManager.h"
#include "ServerBidiReactorBase.h"

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class CreateNewBackupReactor : public ServerBidiReactorBase<
                                   backup::CreateNewBackupRequest,
                                   backup::CreateNewBackupResponse> {
  enum class State {
    AUTHENTICATION = 1,
    KEY_ENTROPY = 2,
    DATA_CHUNKS = 3,
  };

  State state = State::AUTHENTICATION;
  auth::AuthenticationManager authenticationManager;
  std::string keyEntropy;

public:
  std::unique_ptr<grpc::Status> handleRequest(
      backup::CreateNewBackupRequest request,
      backup::CreateNewBackupResponse *response) override {
    std::cout << "here handle request" << std::endl;
    switch (this->state) {
      case State::AUTHENTICATION: {
        if (this->authenticationManager.getState() !=
                auth::AuthenticationState::SUCCESS &&
            !request.has_authenticationrequestdata()) {
          throw std::runtime_error(
              "authentication has not been finished properly");
        }
        if (this->authenticationManager.getState() ==
            auth::AuthenticationState::FAIL) {
          throw std::runtime_error("authentication failure");
        }
        if (this->authenticationManager.getState() !=
            auth::AuthenticationState::SUCCESS) {
          std::cout << "here handle request auth" << std::endl;
          backup::FullAuthenticationResponseData *authResponse =
              this->authenticationManager.processRequest(
                  request.authenticationrequestdata());
          if (this->authenticationManager.getState() ==
              auth::AuthenticationState::SUCCESS) {
            this->state = State::KEY_ENTROPY;
          }
          response->set_allocated_authenticationresponsedata(authResponse);
          return nullptr;
        }
        throw std::runtime_error(
            "invalid state, still authenticating while authentication's "
            "succeeded");
      }
      case State::KEY_ENTROPY: {
        if (!request.has_backupkeyentropy()) {
          throw std::runtime_error(
              "backup key entropy expected but not received");
        }
        std::cout << "here handle request key entropy" << std::endl;
        if (this->authenticationManager.getAuthenticationType() ==
            auth::AuthenticationType::PAKE) {
          this->keyEntropy = request.backupkeyentropy().nonce();
        } else if (
            this->authenticationManager.getAuthenticationType() ==
            auth::AuthenticationType::WALLET) {
          this->keyEntropy = request.backupkeyentropy().rawmessage();
        } else {
          throw std::runtime_error("key entropy: invalid authentication type");
        }
        this->state = State::DATA_CHUNKS;
        return nullptr;
      }
      case State::DATA_CHUNKS: {
        std::cout << "here handle request data chunk"
                  << request.newcompactionchunk().size() << std::endl;

        return nullptr;
      }
    }
    throw std::runtime_error("new backup - invalid state");
  }

  void doneCallback() {
    std::cout << "create new backup done " << this->status.error_code() << "/"
              << this->status.error_message() << std::endl;
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
