#include "BackupOperationsExecutor.h"
#include "DatabaseManager.h"
#include "GlobalDBSingleton.h"
#include "Logger.h"
#include "RustPromiseManager.h"
#include "WorkerThread.h"
#include "lib.rs.h"

namespace comm {
void BackupOperationsExecutor::createMainCompaction(
    std::string backupID,
    size_t futureID) {
  taskType job = [backupID, futureID]() {
    try {
      DatabaseManager::getQueryExecutor().createMainCompaction(backupID);
      ::resolveUnitFuture(futureID);
    } catch (const std::exception &e) {
      ::rejectFuture(futureID, rust::String(e.what()));
      Logger::log(
          "Main compaction creation failed. Details: " + std::string(e.what()));
    }
  };
  GlobalDBSingleton::instance.scheduleOrRunCancellable(job);
}

void BackupOperationsExecutor::restoreFromMainCompaction(
    std::string mainCompactionPath,
    std::string mainCompactionEncryptionKey,
    std::string maxVersion,
    size_t futureID) {
  taskType job = [mainCompactionPath,
                  mainCompactionEncryptionKey,
                  maxVersion,
                  futureID]() {
    try {
      DatabaseManager::getQueryExecutor().restoreFromMainCompaction(
          mainCompactionPath, mainCompactionEncryptionKey, maxVersion);
      ::resolveUnitFuture(futureID);
    } catch (const std::exception &e) {
      std::string errorDetails = std::string(e.what());
      Logger::log(
          "Restore from main compaction failed. Details: " + errorDetails);
      ::rejectFuture(futureID, errorDetails);
    }
  };
  GlobalDBSingleton::instance.scheduleOrRunCancellable(job);
}

void BackupOperationsExecutor::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog,
    size_t futureID) {
  taskType job = [backupLog, futureID]() {
    try {
      DatabaseManager::getQueryExecutor().restoreFromBackupLog(backupLog);
      ::resolveUnitFuture(futureID);
    } catch (const std::exception &e) {
      std::string errorDetails = std::string(e.what());
      Logger::log("Restore from backup log failed. Details: " + errorDetails);
      ::rejectFuture(futureID, errorDetails);
    }
  };
  GlobalDBSingleton::instance.scheduleOrRunCancellable(job);
}

void BackupOperationsExecutor::setBackupID(
    std::string backupID,
    size_t futureID) {
  taskType job = [backupID, futureID]() {
    try {
      DatabaseManager::getQueryExecutor().setMetadata("backupID", backupID);
      ::resolveUnitFuture(futureID);
    } catch (const std::exception &e) {
      ::rejectFuture(futureID, rust::String(e.what()));
      Logger::log("Setting backupID failed. Details: " + std::string(e.what()));
    }
  };
  GlobalDBSingleton::instance.scheduleOrRunCancellable(job);
}
} // namespace comm
