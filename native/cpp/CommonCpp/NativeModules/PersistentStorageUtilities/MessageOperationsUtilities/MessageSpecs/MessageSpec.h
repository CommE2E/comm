#pragma once

#include <folly/String.h>
#include <folly/dynamic.h>
#include <folly/json.h>
#include <string>
#include <vector>

namespace comm {
class MessageSpec {
public:
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) = 0;
  virtual ~MessageSpec() {
  }
};
} // namespace comm
