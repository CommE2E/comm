#pragma once

#include "MessageSpec.h"

namespace comm {
class CreateThreadMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic initialThreadState = rawMessageInfo["initialThreadState"];
    return std::make_unique<std::string>(folly::toJson(initialThreadState));
  }
};
} // namespace comm
