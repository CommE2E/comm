#pragma once

#include "MessageSpec.h"

namespace comm {
class DeleteMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic data = folly::dynamic::object(
        "targetMessageID", rawMessageInfo["targetMessageID"]);
    return std::make_unique<std::string>(folly::toJson(data));
  }
};
} // namespace comm
