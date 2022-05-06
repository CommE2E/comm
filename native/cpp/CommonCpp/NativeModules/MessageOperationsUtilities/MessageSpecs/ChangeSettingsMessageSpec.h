#pragma once

#include "MessageSpec.h"

namespace comm {
class ChangeSettingsMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic changeSettingsData = folly::dynamic::object(
        rawMessageInfo["field"].asString(), rawMessageInfo["value"]);
    return std::make_unique<std::string>(folly::toJson(changeSettingsData));
  }
};
} // namespace comm
