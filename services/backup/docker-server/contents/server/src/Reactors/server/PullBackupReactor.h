#pragma once

#include "BlobGetClientReactor.h"
#include "DatabaseManager.h"
#include "ServerWriteReactorBase.h"
#include "ServiceBlobClient.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <folly/MPMCQueue.h>

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class PullBackupReactor : public ServerWriteReactorBase<
                              backup::PullBackupRequest,
                              backup::PullBackupResponse> {

  enum class State {
    COMPACTION = 1,
    LOGS = 2,
  };

  std::shared_ptr<database::BackupItem> backupItem;
  std::shared_ptr<reactor::BlobGetClientReactor> getReactor;
  std::mutex reactorStateMutex;
  std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks;
  ServiceBlobClient blobClient;
  State state = State::COMPACTION;

  void initializeGetReactor(const std::string &holder);

public:
  PullBackupReactor(const backup::PullBackupRequest *request);

  void initialize() override;

  std::unique_ptr<grpc::Status>
  writeResponse(backup::PullBackupResponse *response) override;
};

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
  if (this->getReactor == nullptr) {
    this->getReactor = std::make_shared<reactor::BlobGetClientReactor>(
        holder, this->dataChunks);
    this->getReactor->request.set_holder(holder);
    this->blobClient.get(this->getReactor);
  }
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
  // TODO get logs
}

std::unique_ptr<grpc::Status>
PullBackupReactor::writeResponse(backup::PullBackupResponse *response) {
  throw std::runtime_error("unimplemented");
}

} // namespace reactor
} // namespace network
} // namespace comm
