#pragma once

#include "MessageSpec.h"

namespace comm {
class UnsupportedMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic unsupportedMessageData =
        folly::dynamic::object("robotext", rawMessageInfo["robotext"])(
            "dontPrefixCreator", rawMessageInfo["dontPrefixCreator"])(
            "unsupportedMessageInfo", rawMessageInfo["unsupportedMessageInfo"]);
    return std::make_unique<std::string>(folly::toJson(unsupportedMessageData));
  }
};
} // namespace comm
