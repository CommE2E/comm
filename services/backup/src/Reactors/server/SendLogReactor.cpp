#include "SendLogReactor.h"

#include "Constants.h"
#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

#include <iostream>

namespace comm {
namespace network {
namespace reactor {

void SendLogReactor::storeInDatabase() {
  // TODO handle attachment holders
  database::LogItem logItem(
      this->backupID,
      this->logID,
      (this->persistenceMethod == PersistenceMethod::BLOB),
      this->value,
      {});
  database::DatabaseManager::getInstance().putLogItem(logItem);
}

std::string SendLogReactor::generateLogID(const std::string &backupID) {
  return backupID + tools::ID_SEPARATOR +
      std::to_string(tools::getCurrentTimestamp());
}

void SendLogReactor::initializePutReactor() {
  if (this->value.empty()) {
    throw std::runtime_error(
        "put reactor cannot be initialized with empty value");
  }
  if (this->hash.empty()) {
    throw std::runtime_error(
        "put reactor cannot be initialized with empty hash");
  }
  if (this->putReactor == nullptr) {
    this->putReactor = std::make_shared<reactor::BlobPutClientReactor>(
        this->value, this->hash, &this->blobPutDoneCV);
    this->blobClient.put(this->putReactor);
  }
}

std::unique_ptr<grpc::Status>
SendLogReactor::readRequest(backup::SendLogRequest request) {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  switch (this->state) {
    case State::USER_ID: {
      if (!request.has_userid()) {
        throw std::runtime_error("user id expected but not received");
      }
      this->userID = request.userid();
      this->state = State::BACKUP_ID;
      return nullptr;
    };
    case State::BACKUP_ID: {
      if (!request.has_backupid()) {
        throw std::runtime_error("backup id expected but not received");
      }
      this->backupID = request.backupid();
      if (database::DatabaseManager::getInstance().findBackupItem(
              this->userID, this->backupID) == nullptr) {
        throw std::runtime_error(
            "trying to send log for a non-existent backup");
      }
      this->logID = this->generateLogID(this->backupID);
      this->response->set_logid(this->logID);
      this->state = State::LOG_HASH;
      return nullptr;
    };
    case State::LOG_HASH: {
      if (!request.has_loghash()) {
        throw std::runtime_error("log hash expected but not received");
      }
      this->hash = request.loghash();
      this->state = State::LOG_CHUNK;
      return nullptr;
    };
    case State::LOG_CHUNK: {
      if (!request.has_logdata()) {
        throw std::runtime_error("log data expected but not received");
      }
      std::unique_ptr<std::string> chunk =
          std::make_unique<std::string>(std::move(*request.mutable_logdata()));
      if (chunk->size() == 0) {
        return std::make_unique<grpc::Status>(grpc::Status::OK);
      }
      // decide if keep in DB or upload to blob
      if (chunk->size() <= LOG_DATA_SIZE_DATABASE_LIMIT) {
        std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 0" << std::endl;
        if (this->persistenceMethod == PersistenceMethod::UNKNOWN) {
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 1" << std::endl;
          this->persistenceMethod = PersistenceMethod::DB;
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 1.1" << std::endl;
          this->value = std::move(*chunk);
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 1.2: " << this->value
                    << std::endl;
          this->storeInDatabase();
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 1.3" << std::endl;
          return std::make_unique<grpc::Status>(grpc::Status::OK);
        } else if (this->persistenceMethod == PersistenceMethod::BLOB) {
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 2" << std::endl;
          this->initializePutReactor();
          this->putReactor->scheduleSendingDataChunk(std::move(chunk));
        } else {
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 3" << std::endl;
          throw std::runtime_error(
              "error - invalid persistence state for chunk smaller than "
              "database limit");
        }
      } else {
        std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 4" << std::endl;
        if (this->persistenceMethod != PersistenceMethod::UNKNOWN &&
            this->persistenceMethod != PersistenceMethod::BLOB) {
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 5" << std::endl;
          throw std::runtime_error(
              "error - invalid persistence state, uploading to blob should be "
              "continued but it is not");
        }
        std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 6" << std::endl;
        if (this->persistenceMethod == PersistenceMethod::UNKNOWN) {
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 7" << std::endl;
          this->persistenceMethod = PersistenceMethod::BLOB;
        }
        std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 8" << std::endl;
        if (this->value.empty()) {
          std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 9" << std::endl;
          this->value =
              tools::generateHolder(this->hash, this->backupID, this->logID);
        }
        std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 10: " << chunk->size()
                  << std::endl;
        this->initializePutReactor();
        this->putReactor->scheduleSendingDataChunk(std::move(chunk));
        std::cout << "here LOG_DATA_SIZE_DATABASE_LIMIT 11" << std::endl;
      }

      return nullptr;
    };
  }
  throw std::runtime_error("send log - invalid state");
}

void SendLogReactor::terminateCallback() {
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);

  if (this->persistenceMethod == PersistenceMethod::DB ||
      this->putReactor == nullptr) {
    return;
  }
  this->putReactor->scheduleSendingDataChunk(std::make_unique<std::string>(""));
  std::unique_lock<std::mutex> lockPut(this->blobPutDoneCVMutex);
  if (this->putReactor->getStatusHolder()->state != ReactorState::DONE) {
    this->blobPutDoneCV.wait(lockPut);
  } else if (!this->putReactor->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        this->putReactor->getStatusHolder()->getStatus().error_message());
  }
  // store in db only when we successfully upload chunks
  this->storeInDatabase();
}

void SendLogReactor::doneCallback() {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  // TODO implement
  std::cout << "receive logs done "
            << this->getStatusHolder()->getStatus().error_code() << "/"
            << this->getStatusHolder()->getStatus().error_message()
            << std::endl;
}

} // namespace reactor
} // namespace network
} // namespace comm
