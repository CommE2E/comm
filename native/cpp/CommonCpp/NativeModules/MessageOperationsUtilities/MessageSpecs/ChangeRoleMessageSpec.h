#pragma once

#include "MessageSpec.h"

namespace comm {
class ChangeRoleMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic changeRoleData =
        folly::dynamic::object("userIDs", rawMessageInfo["userIDs"])(
            "newRole", rawMessageInfo["newRole"]);
    return std::make_unique<std::string>(folly::toJson(changeRoleData));
  }
};
} // namespace comm
