#include "AddAttachmentsUtility.h"

#include "blob_client/src/lib.rs.h"

#include <glog/logging.h>

#include "BackupItem.h"
#include "Constants.h"
#include "DatabaseManager.h"
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
  } catch (std::exception &e) {
    LOG(ERROR) << e.what();
    status = grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return status;
}

std::shared_ptr<database::LogItem>
AddAttachmentsUtility::moveToS3(std::shared_ptr<database::LogItem> logItem) {
  std::string holder = tools::generateHolder(
      logItem->getDataHash(), logItem->getBackupID(), logItem->getLogID());
  std::string data = std::move(logItem->getValue());
  std::shared_ptr<database::LogItem> newLogItem =
      std::make_shared<database::LogItem>(
          logItem->getBackupID(),
          logItem->getLogID(),
          true,
          holder,
          logItem->getAttachmentHolders(),
          logItem->getDataHash());
  // put into S3
  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;
  put_client_initialize_cxx();
  put_client_write_cxx(
      tools::getBlobPutField(blob::PutRequest::DataCase::kHolder),
      holder.c_str());
  put_client_blocking_read_cxx();
  put_client_write_cxx(
      tools::getBlobPutField(blob::PutRequest::DataCase::kBlobHash),
      newLogItem->getDataHash().c_str());
  rust::String responseStr = put_client_blocking_read_cxx();
  // data exists?
  if (!(bool)tools::charPtrToInt(responseStr.c_str())) {
    put_client_write_cxx(
        tools::getBlobPutField(blob::PutRequest::DataCase::kDataChunk),
        std::move(data).c_str());
    put_client_blocking_read_cxx();
  }
  put_client_terminate_cxx();
  return newLogItem;
}

} // namespace reactor
} // namespace network
} // namespace comm
