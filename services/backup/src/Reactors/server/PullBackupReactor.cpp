#include "PullBackupReactor.h"

#include "DatabaseManager.h"

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
  LOG(INFO) << "[PullBackupReactor::initializeGetReactor] holder " << holder;
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
  LOG(INFO) << "[PullBackupReactor::initialize]";
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
  LOG(INFO) << "[PullBackupReactor::initialize] logs size "
            << this->logs.size();
}

std::unique_ptr<grpc::Status>
PullBackupReactor::writeResponse(backup::PullBackupResponse *response) {
  LOG(INFO) << "[PullBackupReactor::writeResponse]";
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  response->set_attachmentholders("");
  response->set_backupid("");
  size_t extraBytesNeeded = 0;
  if (this->state == State::COMPACTION) {
    LOG(INFO) << "[PullBackupReactor::writeResponse][compaction]";
    response->set_backupid(this->backupItem->getBackupID());
    extraBytesNeeded += database::BackupItem::FIELD_BACKUP_ID.size();
    extraBytesNeeded += this->backupItem->getBackupID().size();

    if (this->getReactor == nullptr) {
      extraBytesNeeded += database::BackupItem::FIELD_ATTACHMENT_HOLDERS.size();
      extraBytesNeeded += this->backupItem->getAttachmentHolders().size();
      response->set_attachmentholders(this->backupItem->getAttachmentHolders());
      this->initializeGetReactor(this->backupItem->getCompactionHolder());
    }
    std::string dataChunk;
    LOG(INFO)
        << "[PullBackupReactor::writeResponse][compaction] internal buffer "
           "size/chunk limit "
        << this->internalBuffer.size() << "/" << this->chunkLimit;
    if (this->internalBuffer.size() < this->chunkLimit) {
      LOG(INFO)
          << "[PullBackupReactor::writeResponse][compaction] blocking read";
      this->dataChunks->blockingRead(dataChunk);
    }
    LOG(INFO) << "[PullBackupReactor::writeResponse][compaction] data chunk "
                 "size/extra "
                 "bytes needed/chunk limit "
              << dataChunk.size() << "/" << extraBytesNeeded << "/"
              << this->chunkLimit;
    if (!dataChunk.empty() ||
        this->internalBuffer.size() + extraBytesNeeded >= this->chunkLimit) {
      dataChunk =
          this->prepareDataChunkWithPadding(dataChunk, extraBytesNeeded);
      response->set_compactionchunk(dataChunk);
      LOG(INFO) << "[PullBackupReactor::writeResponse][compaction] sending "
                   "data chunk "
                << dataChunk.size();
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
    this->state = State::LOGS;
    LOG(INFO) << "[PullBackupReactor::writeResponse][compaction] internal "
                 "buffer size "
              << this->internalBuffer.size();
    if (!this->internalBuffer.empty()) {
      response->set_compactionchunk(std::move(this->internalBuffer));
      return nullptr;
    }
  }
  if (this->state == State::LOGS) {
    LOG(INFO) << "[PullBackupReactor::writeResponse][logs] logs size "
              << logs.size();
    // TODO make sure logs are received in correct order regardless their size
    if (this->logs.empty()) {
      // this means that there are no logs at all so we just terminate with
      // the compaction
      return std::make_unique<grpc::Status>(grpc::Status::OK);
    }
    LOG(INFO) << "[PullBackupReactor::writeResponse][logs] current log index "
              << this->currentLogIndex;
    if (this->currentLogIndex == this->logs.size()) {
      // we reached the end of the logs collection so we just want to
      // terminate either we terminate with an error if we have some dangling
      // data or with success if we don't
      if (!this->dataChunks->isEmpty()) {
        throw std::runtime_error("dangling data discovered after reading logs");
      }
      LOG(INFO)
          << "[PullBackupReactor::writeResponse][logs] internal buffer size "
          << this->internalBuffer.size();
      if (!this->internalBuffer.empty()) {
        response->set_logid(this->previousLogID);
        LOG(INFO) << "[PullBackupReactor::writeResponse][logs] log id "
                  << this->previousLogID;
        response->set_logchunk(std::move(this->internalBuffer));
        return nullptr;
      }
      LOG(INFO) << "[PullBackupReactor::writeResponse][logs] terminating";
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
    LOG(INFO)
        << "[PullBackupReactor::writeResponse][logs] is current log present"
        << (this->currentLog != nullptr);
    if (this->currentLog == nullptr) {
      LOG(INFO) << "[PullBackupReactor::writeResponse][logs] new current log";
      this->currentLog = this->logs.at(this->currentLogIndex);
      extraBytesNeeded += database::LogItem::FIELD_LOG_ID.size();
      extraBytesNeeded += this->currentLog->getLogID().size();

      response->set_attachmentholders(this->currentLog->getAttachmentHolders());
      extraBytesNeeded += database::LogItem::FIELD_ATTACHMENT_HOLDERS.size();
      extraBytesNeeded += this->currentLog->getAttachmentHolders().size();

      LOG(INFO) << "[PullBackupReactor::writeResponse][logs] is current log "
                   "persisted in blob "
                << this->currentLog->getPersistedInBlob();
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
        this->nextLog();
        return nullptr;
      }
    } else {
      extraBytesNeeded += database::LogItem::FIELD_LOG_ID.size();
      extraBytesNeeded += this->currentLog->getLogID().size();
    }
    response->set_backupid(this->currentLog->getBackupID());
    response->set_logid(this->currentLog->getLogID());
    LOG(INFO) << "[PullBackupReactor::writeResponse][logs] backup id/log id "
              << this->currentLog->getBackupID() << "/"
              << this->currentLog->getLogID();
    // we want to read the chunks from the blob through the get client until
    // we get an empty chunk - a sign of "end of chunks"
    std::string dataChunk;
    LOG(INFO) << "[PullBackupReactor::writeResponse][logs] internal buffer "
                 "size/chunk limit/end of queue "
              << this->internalBuffer.size() << "/" << this->chunkLimit << "/"
              << this->endOfQueue;
    if (this->internalBuffer.size() < this->chunkLimit && !this->endOfQueue) {
      LOG(INFO) << "[PullBackupReactor::writeResponse][logs] blocking read";
      this->dataChunks->blockingRead(dataChunk);
    }
    this->endOfQueue = this->endOfQueue || (dataChunk.size() == 0);
    LOG(INFO) << "[PullBackupReactor::writeResponse][logs] new end of queue "
              << this->endOfQueue;
    LOG(INFO) << "[PullBackupReactor::writeResponse][logs] extra bytes needed "
              << extraBytesNeeded;
    dataChunk = this->prepareDataChunkWithPadding(dataChunk, extraBytesNeeded);
    LOG(INFO) << "[PullBackupReactor::writeResponse][logs] data chunk size "
              << dataChunk.size();
    if (!this->getReactor->getStatusHolder()->getStatus().ok()) {
      throw std::runtime_error(
          this->getReactor->getStatusHolder()->getStatus().error_message());
    }
    // if we get an empty chunk, we reset the currentLog so we can read the
    // next one from the logs collection.
    //  If there's data inside, we write it to the client and proceed.
    if (dataChunk.empty()) {
      this->nextLog();
      return nullptr;
    } else {
      dataChunk =
          this->prepareDataChunkWithPadding(dataChunk, extraBytesNeeded);
      LOG(INFO) << "[PullBackupReactor::writeResponse][logs] data chunk size2 "
                << dataChunk.size();
      response->set_logchunk(dataChunk);
    }
    return nullptr;
  }

  throw std::runtime_error("unhandled state");
}

void PullBackupReactor::nextLog() {
  ++this->currentLogIndex;
  this->previousLogID = this->currentLog->getLogID();
  this->currentLog = nullptr;
  this->endOfQueue = false;
  LOG(INFO) << "[PullBackupReactor::nextLog] current log index/previous log id "
            << this->currentLogIndex << "/" << this->previousLogID;
}

std::string PullBackupReactor::prepareDataChunkWithPadding(
    const std::string &dataChunk,
    size_t padding) {
  LOG(INFO) << "[PullBackupReactor::prepareDataChunkWithPadding] data chunk "
               "size/padding "
            << dataChunk.size() << "/" << padding;
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

  LOG(INFO)
      << "[PullBackupReactor::prepareDataChunkWithPadding] new chunk size "
      << chunk.size();
  return chunk;
}

void PullBackupReactor::terminateCallback() {
  LOG(INFO) << "[PullBackupReactor::terminateCallback] get reactor present "
            << (this->getReactor != nullptr);
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  std::unique_lock<std::mutex> lockGet(this->blobGetDoneCVMutex);
  if (this->getReactor != nullptr) {
    if (this->getReactor->getStatusHolder()->state != ReactorState::DONE) {
      LOG(INFO)
          << "[PullBackupReactor::terminateCallback] waiting for get reactor";
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
  LOG(INFO) << "[PullBackupReactor::terminateCallback] terminating";
}

} // namespace reactor
} // namespace network
} // namespace comm
