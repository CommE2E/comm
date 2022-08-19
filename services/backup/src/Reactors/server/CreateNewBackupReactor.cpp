#include "CreateNewBackupReactor.h"

#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

namespace comm {
namespace network {
namespace reactor {

std::string CreateNewBackupReactor::generateBackupID() {
  if (this->deviceID.empty()) {
    throw std::runtime_error(
        "trying to generate a backup ID with an empty device ID");
  }
  return this->deviceID + std::to_string(tools::getCurrentTimestamp());
}

std::unique_ptr<ServerBidiReactorStatus> CreateNewBackupReactor::handleRequest(
    backup::CreateNewBackupRequest request,
    backup::CreateNewBackupResponse *response) {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  switch (this->state) {
    case State::USER_ID: {
      if (!request.has_userid()) {
        throw std::runtime_error("user id expected but not received");
      }
      this->userID = request.userid();
      this->state = State::DEVICE_ID;
      return nullptr;
    }
    case State::DEVICE_ID: {
      if (!request.has_deviceid()) {
        throw std::runtime_error("device id expected but not received");
      }
      this->deviceID = request.deviceid();
      this->state = State::KEY_ENTROPY;
      return nullptr;
    }
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

      this->backupID = this->generateBackupID();
      if (database::DatabaseManager::getInstance().findBackupItem(
              this->userID, this->backupID) != nullptr) {
        throw std::runtime_error(
            "Backup with id [" + this->backupID + "] for user [" +
            this->userID + "] already exists, creation aborted");
      }
      response->set_backupid(this->backupID);
      this->holder = tools::generateHolder(this->dataHash, this->backupID);
      // todo:blob perform put:initialize
      return nullptr;
    }
    case State::DATA_CHUNKS: {
      // todo:blob perform put:add chunk
      // (std::move(*request.mutable_newcompactionchunk())
      return nullptr;
    }
  }
  throw std::runtime_error("new backup - invalid state");
}

void CreateNewBackupReactor::terminateCallback() {
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  // todo:blob perform put:add chunk ("")
  // todo:blob perform put:wait for completion

  // TODO add recovery data
  // TODO handle attachments holders
  database::BackupItem backupItem(
      this->userID,
      this->backupID,
      tools::getCurrentTimestamp(),
      tools::generateRandomString(),
      this->holder,
      {});
  database::DatabaseManager::getInstance().putBackupItem(backupItem);
}

} // namespace reactor
} // namespace network
} // namespace comm
