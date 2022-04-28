#include "SendLogReactor.h"

#include "Constants.h"
#include "DatabaseManager.h"
#include "Tools.h"

#include <iostream>

namespace comm {
namespace network {
namespace reactor {

void SendLogReactor::storeInDatabase() {
  // TODO handle attachment holders
  database::LogItem logItem(
      this->backupID,
      this->generateLogID(),
      (this->persistenceMethod == PersistenceMethod::BLOB),
      this->value,
      {});
  database::DatabaseManager::getInstance().putLogItem(logItem);
}

std::string SendLogReactor::generateHolder() {
  // TODO replace mock
  return generateRandomString();
}

std::string SendLogReactor::generateLogID() {
  // TODO replace mock
  return generateRandomString();
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
        if (this->persistenceMethod == PersistenceMethod::UNKNOWN) {
          this->persistenceMethod = PersistenceMethod::DB;
          this->value = std::move(*chunk);
          this->storeInDatabase();
          return std::make_unique<grpc::Status>(grpc::Status::OK);
        } else if (this->persistenceMethod == PersistenceMethod::BLOB) {
          this->initializePutReactor();
          this->putReactor->scheduleSendingDataChunk(std::move(chunk));
        } else {
          throw std::runtime_error(
              "error - invalid persistence state for chunk smaller than "
              "database limit");
        }
      } else {
        if (this->persistenceMethod != PersistenceMethod::UNKNOWN &&
            this->persistenceMethod != PersistenceMethod::BLOB) {
          throw std::runtime_error(
              "error - invalid persistence state, uploading to blob should be "
              "continued but it is not");
        }
        if (this->persistenceMethod == PersistenceMethod::UNKNOWN) {
          this->persistenceMethod = PersistenceMethod::BLOB;
        }
        if (this->value.empty()) {
          this->value = this->generateHolder();
        }
        this->initializePutReactor();
        this->putReactor->scheduleSendingDataChunk(std::move(chunk));
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
  if (this->putReactor->getUtility()->state != ReactorState::DONE) {
    this->blobPutDoneCV.wait(lockPut);
  } else if (!this->putReactor->getUtility()->getStatus().ok()) {
    throw std::runtime_error(
        this->putReactor->getUtility()->getStatus().error_message());
  }
  // store in db only when we successfully upload chunks
  this->storeInDatabase();
}

void SendLogReactor::doneCallback() {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  // TODO implement
  std::cout << "receive logs done " << this->status.error_code() << "/"
            << this->status.error_message() << std::endl;
}

} // namespace reactor
} // namespace network
} // namespace comm
