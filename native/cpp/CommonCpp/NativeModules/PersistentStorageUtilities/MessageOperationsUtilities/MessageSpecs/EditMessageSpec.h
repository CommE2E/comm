#pragma once

#include "MessageSpec.h"

namespace comm {
class EditMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic textData = folly::dynamic::object(
        "targetMessageID",
        rawMessageInfo["targetMessageID"])("text", rawMessageInfo["text"]);
    return std::make_unique<std::string>(folly::toJson(textData));
  }
};
} // namespace comm
