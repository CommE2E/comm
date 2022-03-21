#pragma once

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
    KEY_ENTROPY = 1,
    DATA_HASH = 2,
    DATA_CHUNKS = 3,
  };

  State state = State::KEY_ENTROPY;
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
    case State::KEY_ENTROPY: {
      if (!request.has_keyentropy()) {
        throw std::runtime_error(
            "backup key entropy expected but not received");
      }
      std::cout << "[CNR] here handle request key entropy" << std::endl;
      this->keyEntropy = request.keyentropy();
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
