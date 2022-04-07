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
  throw std::runtime_error("unimplemented");
}

std::unique_ptr<grpc::Status>
PullBackupReactor::writeResponse(backup::PullBackupResponse *response) {
  throw std::runtime_error("unimplemented");
}

} // namespace reactor
} // namespace network
} // namespace comm
