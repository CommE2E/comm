#pragma once

#include "MessageSpec.h"

namespace comm {
class CreateSidebarMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic createSidebarData = rawMessageInfo["initialThreadState"];
    createSidebarData["sourceMessageAuthorID"] =
        rawMessageInfo["sourceMessageAuthorID"];
    return std::make_unique<std::string>(folly::toJson(createSidebarData));
  }
};
} // namespace comm
