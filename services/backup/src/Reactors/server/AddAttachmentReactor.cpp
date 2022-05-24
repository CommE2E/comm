#include "AddAttachmentReactor.h"

#include "Constants.h"
#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

#include <iostream>

namespace comm {
namespace network {
namespace reactor {

std::unique_ptr<grpc::Status>
AddAttachmentReactor::readRequest(backup::AddAttachmentRequest request) {
  // we make sure that the blob client's state is flushed to the main memory
  // as there may be multiple threads from the pool taking over here
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);

  if (!this->parametersPassed) {
    if (!request.has_attachmentparameters()) {
      throw std::runtime_error(
          "attachment parameters expected but not received");
    }
    this->userID = request.attachmentparameters().userid();
    this->backupID = request.attachmentparameters().backupid();
    if (!request.attachmentparameters().logid().empty()) {
      this->logID = request.attachmentparameters().logid();
      this->parentType = ParentType::LOG;
    } else {
      this->parentType = ParentType::BACKUP;
    }
    this->parametersPassed = true;
    return nullptr;
  }
  if (!request.has_holder()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  this->holders.push_back(request.holder());
  return nullptr;
}

void AddAttachmentReactor::terminateCallback() {
  const std::lock_guard<std::mutex> lock(this->reactorStateMutex);

  if (this->parentType == ParentType::BACKUP) {
    std::shared_ptr<database::BackupItem> backupItem =
        database::DatabaseManager::getInstance().findBackupItem(
            this->userID, this->backupID);

    for (const std::string &holder : this->holders) {
      backupItem->appendAttachmentHolder(holder);
    }
    database::DatabaseManager::getInstance().putBackupItem(*backupItem);
    return;
  }
  if (this->parentType == ParentType::LOG) {
    std::shared_ptr<database::LogItem> logItem =
        database::DatabaseManager::getInstance().findLogItem(
            this->backupID, this->logID);
    for (const std::string &holder : this->holders) {
      logItem->appendAttachmentHolder(holder);
    }
    database::DatabaseManager::getInstance().putLogItem(*logItem);
    return;
  }
  throw std::runtime_error("unhandled parent type");
}

} // namespace reactor
} // namespace network
} // namespace comm
