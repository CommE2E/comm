#pragma once

#include "MessageSpec.h"

namespace comm {
class CompoundReactionMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic reactionData = folly::dynamic::object(
        "targetMessageID", rawMessageInfo["targetMessageID"])(
        "reactions", rawMessageInfo["reactions"]);
    return std::make_unique<std::string>(folly::toJson(reactionData));
  }
};
} // namespace comm
