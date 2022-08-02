#include "SendLogReactor.h"

#include "Constants.h"
#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

namespace comm {
namespace network {
namespace reactor {

void SendLogReactor::storeInDatabase() {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::storeInDatabase]";
  bool storedInBlob = this->persistenceMethod == PersistenceMethod::BLOB;
  database::LogItem logItem(
      this->backupID,
      this->logID,
      storedInBlob,
      storedInBlob ? this->blobHolder : this->value,
      {},
      this->hash);
  if (database::LogItem::getItemSize(&logItem) > LOG_DATA_SIZE_DATABASE_LIMIT) {
    throw std::runtime_error(
        "trying to put into the database an item with size " +
        std::to_string(database::LogItem::getItemSize(&logItem)) +
        " that exceeds the limit " +
        std::to_string(LOG_DATA_SIZE_DATABASE_LIMIT));
  }
  database::DatabaseManager::getInstance().putLogItem(logItem);
}

std::string SendLogReactor::generateLogID(const std::string &backupID) {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::generateLogID] backup id " << backupID;
  return backupID + tools::ID_SEPARATOR +
      std::to_string(tools::getCurrentTimestamp());
}

void SendLogReactor::initializePutReactor() {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::initializePutReactor]";
  if (this->blobHolder.empty()) {
    throw std::runtime_error(
        "put reactor cannot be initialized with empty blob holder");
  }
  if (this->hash.empty()) {
    throw std::runtime_error(
        "put reactor cannot be initialized with empty hash");
  }
  if (this->putReactor == nullptr) {
    this->putReactor = std::make_shared<reactor::BlobPutClientReactor>(
        this->blobHolder, this->hash, &this->blobPutDoneCV);
    ServiceBlobClient::getInstance().put(this->putReactor);
  }
}

std::unique_ptr<grpc::Status>
SendLogReactor::readRequest(backup::SendLogRequest request) {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::readRequest] persistence method "
            << (int)this->persistenceMethod;
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  switch (this->state) {
    case State::USER_ID: {
      if (!request.has_userid()) {
        throw std::runtime_error("user id expected but not received");
      }
      this->userID = request.userid();
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[SendLogReactor::readRequest] user id " << this->userID;
      this->state = State::BACKUP_ID;
      return nullptr;
    };
    case State::BACKUP_ID: {
      if (!request.has_backupid()) {
        throw std::runtime_error("backup id expected but not received");
      }
      this->backupID = request.backupid();
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[SendLogReactor::readRequest] backup id " << this->backupID;
      if (database::DatabaseManager::getInstance().findBackupItem(
              this->userID, this->backupID) == nullptr) {
        throw std::runtime_error(
            "trying to send log for a non-existent backup");
      }
      this->logID = this->generateLogID(this->backupID);
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[SendLogReactor::readRequest] log id " << this->logID;
      this->response->set_logcheckpoint(this->logID);
      this->state = State::LOG_HASH;
      return nullptr;
    };
    case State::LOG_HASH: {
      if (!request.has_loghash()) {
        throw std::runtime_error("log hash expected but not received");
      }
      this->hash = request.loghash();
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[SendLogReactor::readRequest] log hash " << this->hash;
      this->state = State::LOG_CHUNK;
      return nullptr;
    };
    case State::LOG_CHUNK: {
      if (!request.has_logdata()) {
        throw std::runtime_error("log data expected but not received");
      }
      std::unique_ptr<std::string> chunk =
          std::make_unique<std::string>(std::move(*request.mutable_logdata()));
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[SendLogReactor::readRequest] log chunk size "
                << chunk->size();
      if (chunk->size() == 0) {
        return std::make_unique<grpc::Status>(grpc::Status::OK);
      }
      if (this->persistenceMethod == PersistenceMethod::DB) {
        throw std::runtime_error(
            "please do not send multiple tiny chunks (less than " +
            std::to_string(LOG_DATA_SIZE_DATABASE_LIMIT) +
            "), merge them into bigger parts instead");
      }
      if (this->persistenceMethod == PersistenceMethod::BLOB) {
        if (this->putReactor == nullptr) {
          throw std::runtime_error(
              "put reactor is being used but has not been initialized");
        }
        this->putReactor->scheduleSendingDataChunk(std::move(chunk));
        return nullptr;
      }
      this->value += std::move(*chunk);
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[SendLogReactor::readRequest] new value size "
                << this->value.size();
      database::LogItem logItem = database::LogItem(
          this->backupID, this->logID, true, this->value, "", this->hash);
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[SendLogReactor::readRequest] log item size "
                << database::LogItem::getItemSize(&logItem) << "/"
                << LOG_DATA_SIZE_DATABASE_LIMIT;
      if (database::LogItem::getItemSize(&logItem) >
          LOG_DATA_SIZE_DATABASE_LIMIT) {
        this->persistenceMethod = PersistenceMethod::BLOB;
        this->blobHolder =
            tools::generateHolder(this->hash, this->backupID, this->logID);
        LOG(INFO) << "["
                  << std::hash<std::thread::id>{}(std::this_thread::get_id())
                  << "]"
                  << "[SendLogReactor::readRequest] new holder "
                  << this->blobHolder;
        this->initializePutReactor();
        this->putReactor->scheduleSendingDataChunk(
            std::make_unique<std::string>(this->value));
        this->value = "";
      } else {
        this->persistenceMethod = PersistenceMethod::DB;
      }
      return nullptr;
    };
  }
  throw std::runtime_error("send log - invalid state");
}

void SendLogReactor::terminateCallback() {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::terminateCallback]";
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);

  if (!this->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        this->getStatusHolder()->getStatus().error_message());
  }

  if (this->persistenceMethod != PersistenceMethod::BLOB &&
      this->persistenceMethod != PersistenceMethod::DB) {
    throw std::runtime_error("Invalid persistence method detected");
  }

  if (this->persistenceMethod == PersistenceMethod::DB ||
      this->putReactor == nullptr) {
    this->storeInDatabase();
    return;
  }
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::terminateCallback] schedule empty chunk";
  this->putReactor->scheduleSendingDataChunk(std::make_unique<std::string>(""));
  std::unique_lock<std::mutex> lockPut(this->blobPutDoneCVMutex);
  if (this->putReactor->getStatusHolder()->state != ReactorState::DONE) {
    LOG(INFO)
        << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
        << "]"
        << "[SendLogReactor::terminateCallback] waiting for the put reactor";
    this->blobPutDoneCV.wait(lockPut);
  }
  if (!this->putReactor->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        this->putReactor->getStatusHolder()->getStatus().error_message());
  }
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::terminateCallback] finalizing";
  // store in db only when we successfully upload chunks
  this->storeInDatabase();
}

void SendLogReactor::doneCallback() {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[SendLogReactor::terminateCallback] doneCallback";
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  // TODO implement
}

} // namespace reactor
} // namespace network
} // namespace comm
