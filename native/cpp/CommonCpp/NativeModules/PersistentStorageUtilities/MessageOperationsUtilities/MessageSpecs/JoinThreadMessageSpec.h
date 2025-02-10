#pragma once

#include "MessageSpec.h"

namespace comm {
class JoinThreadMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    return nullptr;
  }
};
} // namespace comm
