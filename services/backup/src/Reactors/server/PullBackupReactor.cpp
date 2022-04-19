#include "PullBackupReactor.h"

#include "DatabaseManager.h"

#include <iostream>

namespace comm {
namespace network {
namespace reactor {

PullBackupReactor::PullBackupReactor(const backup::PullBackupRequest *request)
    : ServerWriteReactorBase<
          backup::PullBackupRequest,
          backup::PullBackupResponse>(request),
      dataChunks(std::make_shared<folly::MPMCQueue<std::string>>(100)) {
}

void PullBackupReactor::initializeGetReactor(const std::string &holder) {
  if (this->backupItem == nullptr) {
    throw std::runtime_error(
        "get reactor cannot be initialized when backup item is missing");
  }
  this->getReactor.reset(
      new reactor::BlobGetClientReactor(holder, this->dataChunks));
  this->getReactor->request.set_holder(holder);
  this->blobClient.get(this->getReactor);
}

void PullBackupReactor::initialize() {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  if (this->request.userid().empty()) {
    throw std::runtime_error("no user id provided");
  }
  if (this->request.backupid().empty()) {
    throw std::runtime_error("no backup id provided");
  }
  this->backupItem = database::DatabaseManager::getInstance().findBackupItem(
      this->request.userid(), this->request.backupid());
  if (this->backupItem == nullptr) {
    throw std::runtime_error(
        "no backup found for provided parameters: user id [" +
        this->request.userid() + "], backup id [" + this->request.backupid() +
        "]");
  }
  this->logs = database::DatabaseManager::getInstance().findLogItemsForBackup(
      this->request.backupid());
}

std::unique_ptr<grpc::Status>
PullBackupReactor::writeResponse(backup::PullBackupResponse *response) {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  if (this->state == State::COMPACTION) {
    if (this->getReactor == nullptr) {
      this->initializeGetReactor(this->backupItem->getCompactionHolder());
    }
    std::string dataChunk;
    this->dataChunks->blockingRead(dataChunk);
    if (!dataChunk.empty()) {
      response->set_compactionchunk(dataChunk);
      return nullptr;
    }
    if (!this->dataChunks->isEmpty()) {
      throw std::runtime_error(
          "dangling data discovered after reading compaction");
    }
    if (!this->getReactor->getStatus().ok()) {
      throw std::runtime_error(this->getReactor->getStatus().error_message());
    }
    this->state = State::LOGS;
  }
  if (this->state == State::LOGS) {
    // TODO make sure logs are received in correct order regardless their size
    if (this->logs.empty()) {
      return std::make_unique<grpc::Status>(grpc::Status::OK);
    }
    if (this->currentLogIndex == this->logs.size()) {
      if (!this->dataChunks->isEmpty()) {
        throw std::runtime_error("dangling data discovered after reading logs");
      }
      return std::make_unique<grpc::Status>(grpc::Status::OK);
    }
    if (this->currentLogIndex > this->logs.size()) {
      throw std::runtime_error("log index out of bound");
    }
    if (this->currentLog == nullptr) {
      this->currentLog = this->logs.at(this->currentLogIndex);
      if (this->currentLog->getPersistedInBlob()) {
        this->initializeGetReactor(this->currentLog->getValue());
      } else {
        response->set_logchunk(this->currentLog->getValue());
        ++this->currentLogIndex;
        this->currentLog = nullptr;
        return nullptr;
      }
    }
    std::string dataChunk;
    this->dataChunks->blockingRead(dataChunk);
    if (!this->getReactor->getStatus().ok()) {
      throw std::runtime_error(this->getReactor->getStatus().error_message());
    }
    if (dataChunk.empty()) {
      ++this->currentLogIndex;
      this->currentLog = nullptr;
      return nullptr;
    } else {
      response->set_logchunk(dataChunk);
    }
    return nullptr;
  }
  throw std::runtime_error("unhandled state");
}

void PullBackupReactor::terminateCallback() {
  if (!this->getReactor->getStatus().ok()) {
    throw std::runtime_error(this->getReactor->getStatus().error_message());
  }
}

} // namespace reactor
} // namespace network
} // namespace comm
