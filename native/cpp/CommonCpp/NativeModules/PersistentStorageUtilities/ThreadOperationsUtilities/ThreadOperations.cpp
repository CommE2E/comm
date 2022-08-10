#include "ThreadOperations.h"
#include "../../../DatabaseManagers/DatabaseManager.h"
#include "Logger.h"
#include <folly/String.h>
#include <folly/json.h>
#include <stdexcept>

namespace comm {
void ThreadOperations::updateSQLiteUnreadStatus(
    std::string &threadID,
    bool unread) {
  std::unique_ptr<Thread> thread =
      DatabaseManager::getQueryExecutor().getThread(threadID);
  if (thread == nullptr) {
    throw std::runtime_error(
        "Attempted to update non-existing thread with ID:  " + threadID);
  }
  folly::dynamic updatedCurrentUser;
  try {
    updatedCurrentUser = folly::parseJson(thread->current_user);
  } catch (const folly::json::parse_error &e) {
    Logger::log(
        "Invalid json structure of current_user field of thread of id: " +
        threadID + ". Details: " + std::string(e.what()));
    return;
  }
  updatedCurrentUser["unread"] = unread;
  try {
    thread->current_user = folly::toJson(updatedCurrentUser);
  } catch (const folly::json::parse_error &e) {
    Logger::log(
        "Failed to serialize updated current_user JSON object. Details: " +
        std::string(e.what()));
    return;
  }
  // Line below is temporarily blocked to establish
  // whether it is a reason for the crash
  // DatabaseManager::getQueryExecutor().replaceThread(*thread);
}
} // namespace comm
