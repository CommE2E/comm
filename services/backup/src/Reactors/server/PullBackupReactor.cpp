#include "PullBackupReactor.h"

#include "blob_client/src/lib.rs.h"

#include "DatabaseManager.h"

namespace comm {
namespace network {
namespace reactor {

PullBackupReactor::PullBackupReactor(const backup::PullBackupRequest *request)
    : ServerWriteReactorBase<
          backup::PullBackupRequest,
          backup::PullBackupResponse>(request) {
}

void PullBackupReactor::initializeGetReactor(const std::string &holder) {
  if (this->backupItem == nullptr) {
    throw std::runtime_error(
        "get reactor cannot be initialized when backup item is missing");
  }
  get_client_initialize_cxx(holder.c_str());
  this->clientInitialized = true;
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
  response->set_attachmentholders("");
  response->set_backupid("");
  size_t extraBytesNeeded = 0;
  if (this->state == State::COMPACTION) {
    response->set_backupid(this->backupItem->getBackupID());
    extraBytesNeeded += database::BackupItem::FIELD_BACKUP_ID.size();
    extraBytesNeeded += this->backupItem->getBackupID().size();

    if (!this->clientInitialized) {
      extraBytesNeeded += database::BackupItem::FIELD_ATTACHMENT_HOLDERS.size();
      extraBytesNeeded += this->backupItem->getAttachmentHolders().size();
      response->set_attachmentholders(this->backupItem->getAttachmentHolders());
      this->initializeGetReactor(this->backupItem->getCompactionHolder());
    }
    std::string dataChunk;
    if (this->internalBuffer.size() < this->chunkLimit) {
      rust::Vec<unsigned char> responseVec = get_client_blocking_read_cxx();
      dataChunk = (responseVec.empty())
          ? ""
          : std::string(reinterpret_cast<char *>(responseVec.data()));
      dataChunk.resize(responseVec.size());
    }
    if (!dataChunk.empty() ||
        this->internalBuffer.size() + extraBytesNeeded >= this->chunkLimit) {
      dataChunk =
          this->prepareDataChunkWithPadding(dataChunk, extraBytesNeeded);
      response->set_compactionchunk(dataChunk);
      return nullptr;
    }
    this->state = State::LOGS;
    if (!this->internalBuffer.empty()) {
      response->set_compactionchunk(std::move(this->internalBuffer));
      return nullptr;
    }
  }
  if (this->state == State::LOGS) {
    // TODO make sure logs are received in correct order regardless their size
    if (this->logs.empty()) {
      // this means that there are no logs at all so we just terminate with
      // the compaction
      return std::make_unique<grpc::Status>(grpc::Status::OK);
    }
    if (this->currentLogIndex == this->logs.size()) {
      if (!this->internalBuffer.empty()) {
        response->set_logid(this->previousLogID);
        response->set_logchunk(std::move(this->internalBuffer));
        return nullptr;
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
      extraBytesNeeded += database::LogItem::FIELD_LOG_ID.size();
      extraBytesNeeded += this->currentLog->getLogID().size();

      response->set_attachmentholders(this->currentLog->getAttachmentHolders());
      extraBytesNeeded += database::LogItem::FIELD_ATTACHMENT_HOLDERS.size();
      extraBytesNeeded += this->currentLog->getAttachmentHolders().size();

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
    // we want to read the chunks from the blob through the get client until
    // we get an empty chunk - a sign of "end of chunks"
    std::string dataChunk;
    if (this->internalBuffer.size() < this->chunkLimit && !this->endOfQueue) {
      rust::Vec<unsigned char> responseVec = get_client_blocking_read_cxx();
      dataChunk = (responseVec.empty())
          ? ""
          : std::string(reinterpret_cast<char *>(responseVec.data()));
      dataChunk.resize(responseVec.size());
    }
    this->endOfQueue = this->endOfQueue || (dataChunk.size() == 0);
    dataChunk = this->prepareDataChunkWithPadding(dataChunk, extraBytesNeeded);
    // if we get an empty chunk, we reset the currentLog so we can read the
    // next one from the logs collection.
    //  If there's data inside, we write it to the client and proceed.
    if (dataChunk.empty()) {
      this->nextLog();
    } else {
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
}

std::string PullBackupReactor::prepareDataChunkWithPadding(
    const std::string &dataChunk,
    size_t padding) {
  if (dataChunk.size() > this->chunkLimit) {
    throw std::runtime_error(std::string(
        "received data chunk bigger than the chunk limit: " +
        std::to_string(dataChunk.size()) + "/" +
        std::to_string(this->chunkLimit)));
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
  get_client_terminate_cxx();
  if (!this->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        this->getStatusHolder()->getStatus().error_message());
  }
}

} // namespace reactor
} // namespace network
} // namespace comm
