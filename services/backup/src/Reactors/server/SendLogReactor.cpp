#include "SendLogReactor.h"

#include "blob_client/src/lib.rs.h"

#include "Constants.h"
#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

namespace comm {
namespace network {
namespace reactor {

void SendLogReactor::storeInDatabase() {
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
  return backupID + tools::ID_SEPARATOR +
      std::to_string(tools::getCurrentTimestamp());
}

void SendLogReactor::initializePutClient() {
  if (this->blobHolder.empty()) {
    throw std::runtime_error(
        "put reactor cannot be initialized with empty blob holder");
  }
  if (this->hash.empty()) {
    throw std::runtime_error(
        "put reactor cannot be initialized with empty hash");
  }
  put_client_initialize_cxx(this->blobHolder.c_str());
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
      this->response->set_logcheckpoint(this->logID);
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
      if (request.mutable_logdata()->size() == 0) {
        return std::make_unique<grpc::Status>(grpc::Status::OK);
      }
      if (this->persistenceMethod == PersistenceMethod::DB) {
        throw std::runtime_error(
            "please do not send multiple tiny chunks (less than " +
            std::to_string(LOG_DATA_SIZE_DATABASE_LIMIT) +
            "), merge them into bigger parts instead");
      }
      if (this->persistenceMethod == PersistenceMethod::BLOB) {
        put_client_write_cxx(
            this->blobHolder.c_str(),
            tools::getBlobPutField(blob::PutRequest::DataCase::kDataChunk),
            request.mutable_logdata()->c_str());
        put_client_blocking_read_cxx(
            this->blobHolder.c_str()); // todo this should be avoided
                                       // (blocking); we should be able to
                                       // ignore responses; we probably want to
                                       // delegate performing ops to separate
                                       // threads in the base reactors

        return nullptr;
      }
      this->value += std::move(*request.mutable_logdata());
      database::LogItem logItem = database::LogItem(
          this->backupID, this->logID, true, this->value, "", this->hash);
      if (database::LogItem::getItemSize(&logItem) >
          LOG_DATA_SIZE_DATABASE_LIMIT) {
        this->persistenceMethod = PersistenceMethod::BLOB;
        this->blobHolder =
            tools::generateHolder(this->hash, this->backupID, this->logID);
        this->initializePutClient();
        put_client_write_cxx(
            this->blobHolder.c_str(),
            tools::getBlobPutField(blob::PutRequest::DataCase::kHolder),
            this->blobHolder.c_str());
        put_client_blocking_read_cxx(
            this->blobHolder.c_str()); // todo this should be avoided
                                       // (blocking); we should be able to
                                       // ignore responses; we probably want to
                                       // delegate performing ops to separate
                                       // threads in the base reactors
        put_client_write_cxx(
            this->blobHolder.c_str(),
            tools::getBlobPutField(blob::PutRequest::DataCase::kBlobHash),
            this->hash.c_str());
        rust::String responseStr = put_client_blocking_read_cxx(
            this->blobHolder.c_str()); // todo this should be avoided
                                       // (blocking); we should be able to
                                       // ignore responses; we probably
                                       // want to delegate performing ops
                                       // to separate threads in the base
                                       // reactors
        // data exists?
        if ((bool)tools::charPtrToInt(responseStr.c_str())) {
          return std::make_unique<grpc::Status>(grpc::Status::OK);
        }
        put_client_write_cxx(
            this->blobHolder.c_str(),
            tools::getBlobPutField(blob::PutRequest::DataCase::kDataChunk),
            std::move(this->value).c_str());
        put_client_blocking_read_cxx(
            this->blobHolder.c_str()); // todo this should be avoided
                                       // (blocking); we should be able to
                                       // ignore responses; we probably want to
                                       // delegate performing ops to separate
                                       // threads in the base reactors
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
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  put_client_terminate_cxx(this->blobHolder.c_str());

  if (!this->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        this->getStatusHolder()->getStatus().error_message());
  }

  if (this->persistenceMethod != PersistenceMethod::BLOB &&
      this->persistenceMethod != PersistenceMethod::DB) {
    throw std::runtime_error("Invalid persistence method detected");
  }

  if (this->persistenceMethod == PersistenceMethod::DB) {
    this->storeInDatabase();
    return;
  }
  // store in db only when we successfully upload chunks
  this->storeInDatabase();
}

void SendLogReactor::doneCallback() {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
  // TODO implement
}

} // namespace reactor
} // namespace network
} // namespace comm
