#pragma once

#include "DatabaseEntitiesTools.h"

#include <folly/concurrency/ConcurrentHashMap.h>

#include <functional>
#include <map>
#include <memory>
#include <string>
#include <vector>

namespace comm {
namespace network {
namespace database {

// thread-safe in-memory database
struct DatabaseSimulator {
  // userID -> map(created -> item)
  folly::ConcurrentHashMap<
      std::string,
      std::unique_ptr<std::map<uint64_t, BackupItem>>>
      backup;
  // backup id -> list of logs
  folly::ConcurrentHashMap<
      std::string,
      std::unique_ptr<std::vector<std::shared_ptr<LogItem>>>>
      log;
};

} // namespace database
} // namespace network
} // namespace comm
