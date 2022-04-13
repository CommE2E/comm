#pragma once

#include "Constants.h"
#include "ServerReadReactorBase.h"
#include "ServiceBlobClient.h"
#include "Tools.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class SendLogReactor : public ServerReadReactorBase<
                           backup::SendLogRequest,
                           google::protobuf::Empty> {
  enum class State {
    USER_ID = 1,
    BACKUP_ID = 2,
    LOG_HASH = 3,
    LOG_CHUNK = 4,
  };

  enum class PersistenceMethod {
    UNKNOWN = 0,
    DB = 1,
    BLOB = 2,
  };

  State state = State::USER_ID;
  PersistenceMethod persistenceMethod = PersistenceMethod::UNKNOWN;
  std::string userID;
  std::string backupID;
  std::string hash;
  // either the value itself which is a dump of a single operation (if
  // `persistedInBlob` is false) or the holder to blob (if `persistedInBlob` is
  // true)
  std::string value;
  std::mutex reactorStateMutex;
  std::condition_variable blobDoneCV;
  std::mutex blobDoneCVMutex;

  std::shared_ptr<reactor::BlobPutClientReactor> putReactor;
  ServiceBlobClient blobClient;

  void storeInDatabase();
  std::string generateHolder();
  std::string generateLogID();
  void initializePutReactor();

  void storeInBlob(const std::string &data) {
  }

public:
  using ServerReadReactorBase<backup::SendLogRequest, google::protobuf::Empty>::
      ServerReadReactorBase;

  std::unique_ptr<grpc::Status>
  readRequest(backup::SendLogRequest request) override;
  void doneCallback() override;
  void terminateCallback() override;
};

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
        this->value, this->hash, &this->blobDoneCV);
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
  std::unique_lock<std::mutex> lock2(this->blobDoneCVMutex);
  if (this->putReactor->isDone()) {
    if (!this->putReactor->getStatus().ok()) {
      throw std::runtime_error(this->putReactor->getStatus().error_message());
    }
  } else {
    this->blobDoneCV.wait(lock2);
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
