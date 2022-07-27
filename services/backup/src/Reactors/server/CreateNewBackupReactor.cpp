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
  LOG(INFO) << "[CreateNewBackupReactor::handleRequest]";
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  switch (this->state) {
    case State::USER_ID: {
      if (!request.has_userid()) {
        throw std::runtime_error("user id expected but not received");
      }
      this->userID = request.userid();
      LOG(INFO) << "[CreateNewBackupReactor::handleRequest] user id "
                << this->userID;
      this->state = State::DEVICE_ID;
      return nullptr;
    }
    case State::DEVICE_ID: {
      if (!request.has_deviceid()) {
        throw std::runtime_error("device id expected but not received");
      }
      this->deviceID = request.deviceid();
      LOG(INFO) << "[CreateNewBackupReactor::handleRequest] device id "
                << this->deviceID;
      this->state = State::KEY_ENTROPY;
      return nullptr;
    }
    case State::KEY_ENTROPY: {
      if (!request.has_keyentropy()) {
        throw std::runtime_error(
            "backup key entropy expected but not received");
      }
      this->keyEntropy = request.keyentropy();
      LOG(INFO) << "[CreateNewBackupReactor::handleRequest] key entropy "
                << this->keyEntropy;
      this->state = State::DATA_HASH;
      return nullptr;
    }
    case State::DATA_HASH: {
      if (!request.has_newcompactionhash()) {
        throw std::runtime_error("data hash expected but not received");
      }
      this->dataHash = request.newcompactionhash();
      LOG(INFO) << "[CreateNewBackupReactor::handleRequest] data hash "
                << this->dataHash;
      this->state = State::DATA_CHUNKS;

      this->backupID = this->generateBackupID();
      LOG(INFO) << "[CreateNewBackupReactor::handleRequest] backup id "
                << this->backupID;
      if (database::DatabaseManager::getInstance().findBackupItem(
              this->userID, this->backupID) != nullptr) {
        throw std::runtime_error(
            "Backup with id [" + this->backupID + "] for user [" +
            this->userID + "] already exists, creation aborted");
      }
      response->set_backupid(this->backupID);
      this->holder = tools::generateHolder(this->dataHash, this->backupID);
      LOG(INFO) << "[CreateNewBackupReactor::handleRequest] holder "
                << this->holder;
      this->putReactor = std::make_shared<reactor::BlobPutClientReactor>(
          this->holder, this->dataHash, &this->blobPutDoneCV);
      this->blobClient.put(this->putReactor);
      return nullptr;
    }
    case State::DATA_CHUNKS: {
      LOG(INFO) << "[CreateNewBackupReactor::handleRequest] data chunk size "
                << request.newcompactionchunk().size();
      this->putReactor->scheduleSendingDataChunk(std::make_unique<std::string>(
          std::move(*request.mutable_newcompactionchunk())));
      return nullptr;
    }
  }
  throw std::runtime_error("new backup - invalid state");
}

void CreateNewBackupReactor::terminateCallback() {
  LOG(INFO)
      << "[CreateNewBackupReactor::terminateCallback] put reactor present "
      << (this->putReactor != nullptr);
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  if (this->putReactor == nullptr) {
    return;
  }
  LOG(INFO) << "[CreateNewBackupReactor::terminateCallback] scheduling empty "
               "data chunk";
  this->putReactor->scheduleSendingDataChunk(std::make_unique<std::string>(""));
  std::unique_lock<std::mutex> lock2(this->blobPutDoneCVMutex);
  if (this->putReactor->getStatusHolder()->state != ReactorState::DONE) {
    LOG(INFO) << "[CreateNewBackupReactor::terminateCallback] waiting for put "
                 "reactor";
    this->blobPutDoneCV.wait(lock2);
  }
  if (this->putReactor->getStatusHolder()->state != ReactorState::DONE) {
    throw std::runtime_error("put reactor has not been terminated properly");
  }
  if (!this->putReactor->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        this->putReactor->getStatusHolder()->getStatus().error_message());
  }
  LOG(INFO)
      << "[CreateNewBackupReactor::terminateCallback] putting backup item";
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
