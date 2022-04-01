#pragma once

#include "ServerBidiReactorBase.h"
#include "ServiceBlobClient.h"
#include "Tools.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <memory>
#include <string>

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
  std::unique_ptr<ServerBidiReactorStatus> handleRequest(
      backup::CreateNewBackupRequest request,
      backup::CreateNewBackupResponse *response) override;
  void doneCallback();
};

std::string CreateNewBackupReactor::generateBackupID() {
  // mock
  return generateRandomString();
}

std::unique_ptr<ServerBidiReactorStatus> CreateNewBackupReactor::handleRequest(
    backup::CreateNewBackupRequest request,
    backup::CreateNewBackupResponse *response) {
  switch (this->state) {
    case State::KEY_ENTROPY: {
      if (!request.has_keyentropy()) {
        throw std::runtime_error(
            "backup key entropy expected but not received");
      }
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
      // TODO initialize blob client reactor
      if (ServiceBlobClient::getInstance().putReactor == nullptr) {
        throw std::runtime_error(
            "blob client reactor has not been initialized");
      }

      ServiceBlobClient::getInstance().putReactor->scheduleSendingDataChunk(
          *request.mutable_newcompactionchunk());

      return nullptr;
    }
  }
  throw std::runtime_error("new backup - invalid state");
}

void CreateNewBackupReactor::doneCallback() {
  std::string emptyString = "";
  ServiceBlobClient::getInstance().putReactor->scheduleSendingDataChunk(
      emptyString);
}

} // namespace reactor
} // namespace network
} // namespace comm
