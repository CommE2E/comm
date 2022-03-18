#pragma once

#include "AuthenticationManager.h"
#include "ServerBidiReactorBase.h"
#include "ServiceBlobClient.h"
#include "Tools.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <iostream>
#include <memory>
#include <string>

#include <chrono>
#include <thread>

namespace comm {
namespace network {
namespace reactor {

class CreateNewBackupReactor : public ServerBidiReactorBase<
                                   backup::CreateNewBackupRequest,
                                   backup::CreateNewBackupResponse> {
  enum class State {
    AUTHENTICATION = 1,
    KEY_ENTROPY = 2,
    DATA_HASH = 3,
    DATA_CHUNKS = 4,
  };

  State state = State::AUTHENTICATION;
  auth::AuthenticationManager authenticationManager;
  std::string keyEntropy;
  std::string dataHash;
  std::string backupID;

  std::string generateBackupID();

public:
  std::unique_ptr<grpc::Status> handleRequest(
      backup::CreateNewBackupRequest request,
      backup::CreateNewBackupResponse *response) override;
  void doneCallback();
};

std::string CreateNewBackupReactor::generateBackupID() {
  // mock
  return generateRandomString();
}

std::unique_ptr<grpc::Status> CreateNewBackupReactor::handleRequest(
    backup::CreateNewBackupRequest request,
    backup::CreateNewBackupResponse *response) {
  std::cout << "[CNR] here handle request" << std::endl;
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
        std::cout << "[CNR] here handle request auth" << std::endl;
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
      std::cout << "[CNR] here handle request key entropy" << std::endl;
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
      this->state = State::DATA_HASH;
      return nullptr;
    }
    case State::DATA_HASH: {
      if (!request.has_newcompactionhash()) {
        throw std::runtime_error("data hash expected but not received");
      }
      this->dataHash = request.newcompactionhash();
      this->state = State::DATA_CHUNKS;

      // TODO confirm - holder may be a backup id
      this->backupID = this->generateBackupID();
      ServiceBlobClient::getInstance().put(this->backupID, this->dataHash);
      return nullptr;
    }
    case State::DATA_CHUNKS: {
      std::cout << "[CNR] here handle request data chunk "
                << request.newcompactionchunk().size() << std::endl;
      // TODO initialize blob client reactor
      if (ServiceBlobClient::getInstance().putReactor == nullptr) {
        throw std::runtime_error(
            "blob client reactor has not been initialized");
      }
      std::cout << "[CNR] here enqueueing data chunk" << std::endl;

      ServiceBlobClient::getInstance().putReactor->scheduleSendingDataChunk(
          request.newcompactionchunk());

      return nullptr;
    }
  }
  throw std::runtime_error("new backup - invalid state");
}

void CreateNewBackupReactor::doneCallback() {
  std::cout << "[CNR] create new backup done " << this->status.error_code()
            << "/" << this->status.error_message() << std::endl;
  std::cout << "[CNR] enqueueing empty chunk to end blob upload" << std::endl;
  ServiceBlobClient::getInstance().putReactor->scheduleSendingDataChunk("");
}

} // namespace reactor
} // namespace network
} // namespace comm
