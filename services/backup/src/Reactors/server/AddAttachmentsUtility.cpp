#include "AddAttachmentsUtility.h"

#include "BackupItem.h"
#include "BlobPutClientReactor.h"
#include "Constants.h"
#include "DatabaseManager.h"
#include "ServiceBlobClient.h"
#include "Tools.h"

namespace comm {
namespace network {
namespace reactor {

grpc::Status AddAttachmentsUtility::processRequest(
    const backup::AddAttachmentsRequest *request) {
  grpc::Status status = grpc::Status::OK;
  std::string userID = request->userid();
  std::string backupID = request->backupid();
  std::string logID = request->logid();
  const std::string holders = request->holders();
  try {
    if (userID.empty()) {
      throw std::runtime_error("user id required but not provided");
    }
    if (backupID.empty()) {
      throw std::runtime_error("backup id required but not provided");
    }
    if (holders.empty()) {
      throw std::runtime_error("holders required but not provided");
    }

    if (logID.empty()) {
      // add these attachments to backup
      std::shared_ptr<database::BackupItem> backupItem =
          database::DatabaseManager::getInstance().findBackupItem(
              userID, backupID);
      backupItem->addAttachmentHolders(holders);
      database::DatabaseManager::getInstance().putBackupItem(*backupItem);
    } else {
      // add these attachments to log
      std::shared_ptr<database::LogItem> logItem =
          database::DatabaseManager::getInstance().findLogItem(backupID, logID);
      logItem->addAttachmentHolders(holders);
      if (!logItem->getPersistedInBlob() &&
          database::LogItem::getItemSize(logItem.get()) >
              LOG_DATA_SIZE_DATABASE_LIMIT) {
        bool old = logItem->getPersistedInBlob();
        logItem = this->moveToS3(logItem);
      }
      database::DatabaseManager::getInstance().putLogItem(*logItem);
    }
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    status = grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return status;
}

std::shared_ptr<database::LogItem> AddAttachmentsUtility::moveToS3(
    std::shared_ptr<database::LogItem> logItem) {
  std::string holder = tools::generateHolder(
      logItem->getDataHash(), logItem->getBackupID(), logItem->getLogID());
  std::string data = std::move(logItem->getValue());
  std::shared_ptr<database::LogItem> newLogItem = std::make_shared<database::LogItem>(
      logItem->getBackupID(),
      logItem->getLogID(),
      true,
      holder,
      logItem->getAttachmentHolders(),
      logItem->getDataHash());
  // put into S3
  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;
  std::shared_ptr<reactor::BlobPutClientReactor> putReactor =
      std::make_shared<reactor::BlobPutClientReactor>(
          holder, newLogItem->getDataHash(), &blobPutDoneCV);
  ServiceBlobClient().put(putReactor);
  std::unique_lock<std::mutex> lockPut(blobPutDoneCVMutex);
  putReactor->scheduleSendingDataChunk(
      std::make_unique<std::string>(std::move(data)));
  putReactor->scheduleSendingDataChunk(std::make_unique<std::string>(""));
  if (putReactor->getStatusHolder()->state != reactor::ReactorState::DONE) {
    blobPutDoneCV.wait(lockPut);
  }
  if (!putReactor->getStatusHolder()->getStatus().ok()) {
    throw std::runtime_error(
        putReactor->getStatusHolder()->getStatus().error_message());
  }
  return newLogItem;
}

} // namespace reactor
} // namespace network
} // namespace comm
