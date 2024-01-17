#include "BackupOperationsExecutor.h"
#include "DatabaseManager.h"
#include "GlobalDBSingleton.h"
#include "Logger.h"
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
    std::string mainCompactionEncryptionKey) {
  taskType job = [mainCompactionPath, mainCompactionEncryptionKey]() {
    try {
      DatabaseManager::getQueryExecutor().restoreFromMainCompaction(
          mainCompactionPath, mainCompactionEncryptionKey);
    } catch (const std::exception &e) {
      // TODO: Inform Rust networking about failure
      // of restoration from main compaction.
      Logger::log(
          "Restore from main compaction failed. Details: " +
          std::string(e.what()));
    }
  };
  GlobalDBSingleton::instance.scheduleOrRunCancellable(job);
}

void BackupOperationsExecutor::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog) {
  taskType job = [backupLog]() {
    try {
      DatabaseManager::getQueryExecutor().restoreFromBackupLog(backupLog);
    } catch (const std::exception &e) {
      // TODO: Inform Rust networking about failure
      // of restoration from backup log.
      Logger::log(
          "Restore from backup log failed. Details: " + std::string(e.what()));
    }
  };
  GlobalDBSingleton::instance.scheduleOrRunCancellable(job);
}
} // namespace comm
