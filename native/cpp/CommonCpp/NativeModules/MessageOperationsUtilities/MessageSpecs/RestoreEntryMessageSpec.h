#pragma once

#include "MessageSpec.h"

namespace comm {
class RestoreEntryMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic entryData =
        folly::dynamic::object("entryID", rawMessageInfo["entryID"])(
            "date", rawMessageInfo["date"])("text", rawMessageInfo["text"]);
    return std::make_unique<std::string>(folly::toJson(entryData));
  }
};
} // namespace comm
