#include "CreateNewBackupReactor.h"

#include "DatabaseManager.h"
#include "Tools.h"

namespace comm {
namespace network {
namespace reactor {

std::string CreateNewBackupReactor::generateBackupID() {
  // mock
  return generateRandomString();
}

void CreateNewBackupReactor::initializeHolderReactor() {
  if (this->holder.empty()) {
    throw std::runtime_error(
        "holder reactor cannot be initialized with empty holder");
  }
  if (this->dataHash.empty()) {
    throw std::runtime_error(
        "holder reactor cannot be initialized with empty hash");
  }
  if (this->holderReactor == nullptr) {
    this->holderReactor =
        std::make_shared<reactor::BlobAppendHolderClientReactor>(
            this->holder, this->dataHash, &this->blobAppendHolderDoneCV);
    this->blobClient.appendHolder(this->holderReactor);
  }
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

      // TODO confirm - holder may be a backup id
      this->backupID = this->generateBackupID();
      response->set_backupid(this->backupID);
      this->holder = this->backupID;
      this->putReactor = std::make_shared<reactor::BlobPutClientReactor>(
          this->holder, this->dataHash, &this->blobPutDoneCV);
      this->blobClient.put(this->putReactor);
      return nullptr;
    }
    case State::DATA_CHUNKS: {
      this->putReactor->scheduleSendingDataChunk(std::make_unique<std::string>(
          std::move(*request.mutable_newcompactionchunk())));
      return nullptr;
    }
  }
  throw std::runtime_error("new backup - invalid state");
}

void CreateNewBackupReactor::terminateCallback() {
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  if (this->putReactor == nullptr) {
    return;
  }
  this->putReactor->scheduleSendingDataChunk(std::make_unique<std::string>(""));
  std::unique_lock<std::mutex> lock2(this->blobPutDoneCVMutex);
  if (this->putReactor->isDone() && !this->putReactor->getStatus().ok()) {
    throw std::runtime_error(this->putReactor->getStatus().error_message());
  }
  if (!this->putReactor->isDone()) {
    this->blobPutDoneCV.wait(lock2);
  }
  if (this->putReactor->getDataExists()) {
    this->initializeHolderReactor();
    std::unique_lock<std::mutex> lockHolder(this->blobAppendHolderDoneCVMutex);
    if (this->holderReactor->isDone() &&
        !this->holderReactor->getStatus().ok()) {
      throw std::runtime_error(
          this->holderReactor->getStatus().error_message());
    }
    if (!this->holderReactor->isDone()) {
      this->blobAppendHolderDoneCV.wait(lockHolder);
    }
  }
  try {
    // TODO add recovery data
    // TODO handle attachments holders
    database::BackupItem backupItem(
        this->userID,
        this->backupID,
        getCurrentTimestamp(),
        generateRandomString(),
        this->holder,
        {});
    database::DatabaseManager::getInstance().putBackupItem(backupItem);
  } catch (std::runtime_error &e) {
    std::cout << "db operations error: " << e.what() << std::endl;
  }
}

} // namespace reactor
} // namespace network
} // namespace comm
