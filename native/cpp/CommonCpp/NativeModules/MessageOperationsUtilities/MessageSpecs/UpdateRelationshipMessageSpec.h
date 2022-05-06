#pragma once

#include "MessageSpec.h"

namespace comm {
class UpdateRelationshipMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic updateRelationshipData =
        folly::dynamic::object("operation", rawMessageInfo["operation"])(
            "targetID", rawMessageInfo["targetID"]);
    return std::make_unique<std::string>(folly::toJson(updateRelationshipData));
  }
};
} // namespace comm
