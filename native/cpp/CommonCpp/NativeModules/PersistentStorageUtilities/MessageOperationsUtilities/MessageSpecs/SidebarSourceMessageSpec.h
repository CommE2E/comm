#pragma once

#include "MessageSpec.h"

namespace comm {
class SidebarSourceMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic sourceMessage = rawMessageInfo["sourceMessage"];
    return std::make_unique<std::string>(folly::toJson(sourceMessage));
  }
};
} // namespace comm
