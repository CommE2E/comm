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
  this->getReactor.reset(new reactor::BlobGetClientReactor(
      holder, this->dataChunks, &this->blobGetDoneCV));
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
    response->set_backupid(this->backupItem->getBackupID());
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
    if (!this->getReactor->getStatusHolder()->getStatus().ok()) {
      throw std::runtime_error(
          this->getReactor->getStatusHolder()->getStatus().error_message());
    }
    if (!this->backupItem->getAttachmentHolders().empty()) {
      this->state = State::COMPACTION_ATTACHMENTS;
    } else {
      this->state = State::LOGS;
    }
    return nullptr;
  }
  if (this->state == State::COMPACTION_ATTACHMENTS) {
    if (this->backupItem->getAttachmentHolders().empty()) {
      throw std::runtime_error("trying to send empty backup attachments");
    }
    response->set_attachmentholders(this->backupItem->getAttachmentHolders());
    this->state = State::LOGS;
    return nullptr;
  }
  if (this->state == State::LOGS) {
    // TODO make sure logs are received in correct order regardless their size
    if (this->logs.empty()) {
      // this means that there are no logs at all so we just terminate with
      // the compaction
      return std::make_unique<grpc::Status>(grpc::Status::OK);
    }
    if (this->currentLogIndex == this->logs.size()) {
      // we reached the end of the logs collection so we just want to
      // terminate either we terminate with an error if we have some dangling
      // data or with success if we don't
      if (!this->dataChunks->isEmpty()) {
        throw std::runtime_error("dangling data discovered after reading logs");
      }
      return std::make_unique<grpc::Status>(grpc::Status::OK);
    }
    if (this->currentLogIndex > this->logs.size()) {
      // we went out of the scope of the logs collection, this should never
      // happen and should be perceived as an error
      throw std::runtime_error("log index out of bound");
    }
    // this means that we're not reading anything between invocations of
    // writeResponse
    // it is only not null when we read data in chunks
    if (this->currentLog == nullptr) {
      this->currentLog = this->logs.at(this->currentLogIndex);
      if (this->currentLog->getPersistedInBlob()) {
        // if the item is stored in the blob, we initialize the get reactor
        // and proceed
        this->initializeGetReactor(this->currentLog->getValue());
      } else {
        // if the item is persisted in the database, we just take it, send the
        // data to the client and reset currentLog so the next invocation of
        // writeResponse will take another one from the collection
        response->set_logid(this->currentLog->getLogID());
        response->set_logchunk(this->currentLog->getValue());
        if (!this->currentLog->getAttachmentHolders().empty()) {
          this->state = State::LOG_ATTACHMENTS;
        } else {
          this->nextLog();
        }
        return nullptr;
      }
    }
    response->set_logid(this->currentLog->getLogID());
    // we want to read the chunks from the blob through the get client until
    // we get an empty chunk - a sign of "end of chunks"
    std::string dataChunk;
    this->dataChunks->blockingRead(dataChunk);
    if (!this->getReactor->getStatusHolder()->getStatus().ok()) {
      throw std::runtime_error(
          this->getReactor->getStatusHolder()->getStatus().error_message());
    }
    // if we get an empty chunk, we reset the currentLog so we can read the
    // next one from the logs collection.
    //  If there's data inside, we write it to the client and proceed.
    if (dataChunk.empty()) {
      if (!this->currentLog->getAttachmentHolders().empty()) {
        this->state = State::LOG_ATTACHMENTS;
      } else {
        this->nextLog();
      }
      return nullptr;
    } else {
      response->set_logchunk(dataChunk);
    }
    return nullptr;
  }
  if (this->state == State::LOG_ATTACHMENTS) {
    if (this->currentLog == nullptr) {
      throw std::runtime_error(
          "trying to send attachments of a non-existing log item");
    }
    if (this->currentLog->getAttachmentHolders().empty()) {
      throw std::runtime_error("trying to send empty attachments");
    }
    response->set_attachmentholders(this->currentLog->getAttachmentHolders());
    this->nextLog();
    return nullptr;
  }

  throw std::runtime_error("unhandled state");
}

void PullBackupReactor::nextLog() {
  ++this->currentLogIndex;
  this->previousLogID = this->currentLog->getLogID();
  this->currentLog = nullptr;
}

std::string PullBackupReactor::prepareDataChunkWithPadding(
    const std::string &dataChunk,
    size_t padding) {
  if (dataChunk.size() > this->chunkLimit) {
    throw std::runtime_error("received data chunk bigger than the chunk limit");
  }

  std::string chunk = std::move(this->internalBuffer) + dataChunk;
  const size_t realSize = chunk.size() + padding;
  if (realSize <= this->chunkLimit) {
    return chunk;
  }
  const size_t bytesToStash = realSize - this->chunkLimit;
  this->internalBuffer = std::string(chunk.end() - bytesToStash, chunk.end());
  chunk.resize(chunk.size() - bytesToStash);
  if (chunk.size() > this->chunkLimit) {
    throw std::runtime_error("new data chunk incorrectly calculated");
  }

  return chunk;
}

void PullBackupReactor::terminateCallback() {
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  std::unique_lock<std::mutex> lockGet(this->blobGetDoneCVMutex);
  if (this->getReactor != nullptr) {
    if (this->getReactor->getStatusHolder()->state != ReactorState::DONE) {
      this->blobGetDoneCV.wait(lockGet);
    }
    if (this->getReactor->getStatusHolder()->state != ReactorState::DONE) {
      throw std::runtime_error("get reactor has not been terminated properly");
    }
    if (!this->getReactor->getStatusHolder()->getStatus().ok()) {
      throw std::runtime_error(
          this->getReactor->getStatusHolder()->getStatus().error_message());
    }
  }
  if (!this->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        this->getStatusHolder()->getStatus().error_message());
  }
}

} // namespace reactor
} // namespace network
} // namespace comm
