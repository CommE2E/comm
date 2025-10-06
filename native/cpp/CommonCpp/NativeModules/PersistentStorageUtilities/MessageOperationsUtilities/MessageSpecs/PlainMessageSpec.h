#pragma once

#include "MessageSpec.h"

namespace comm {
class PlainMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic content = folly::dynamic::object;
    content["rawContent"] = rawMessageInfo["rawContent"];
    return std::make_unique<std::string>(folly::toJson(content));
  }
};
} // namespace comm
