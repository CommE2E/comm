#pragma once

#include "DatabaseEntitiesTools.h"

#include <folly/concurrency/ConcurrentHashMap.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace database {

// thread-safe in-memory database
struct DatabaseSimulator {
  // hash -> item
  folly::ConcurrentHashMap<std::string, std::shared_ptr<BlobItem>> blob;
  // holder -> item
  folly::ConcurrentHashMap<std::string, std::shared_ptr<ReverseIndexItem>>
      reverseIndex;
};

} // namespace database
} // namespace network
} // namespace comm
