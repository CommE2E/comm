#pragma once

#include "MessageSpec.h"

namespace comm {
class MultimediaMessageSpec : public MessageSpec {
  virtual std::unique_ptr<std::string>
  messageContentForClientDB(const folly::dynamic &rawMessageInfo) override {
    folly::dynamic mediaIDs = folly::dynamic::array();
    for (const auto &mediaInfo : rawMessageInfo["media"]) {
      mediaIDs.push_back(std::stoi(mediaInfo["id"].asString()));
    }
    return std::make_unique<std::string>(folly::toJson(mediaIDs));
  }
};
} // namespace comm
