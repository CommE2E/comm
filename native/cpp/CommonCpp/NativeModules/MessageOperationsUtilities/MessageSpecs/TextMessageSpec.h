#pragma once

#include "MessageSpec.h"

namespace comm {
class TextMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    return std::make_unique<std::string>(rawMessageInfo["text"].asString());
  }
};
} // namespace comm
