#pragma once

#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

class UpdateMessageSearchIndexOperation : public DBOperationBase {
public:
  UpdateMessageSearchIndexOperation(
      jsi::Runtime &rt,
      const jsi::Object &payload)
      : originalMessageID{payload.getProperty(rt, "originalMessageID")
                              .asString(rt)
                              .utf8(rt)},
        messageID{payload.getProperty(rt, "messageID").asString(rt).utf8(rt)},
        content{payload.getProperty(rt, "content").asString(rt).utf8(rt)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().updateMessageSearchIndex(
        this->originalMessageID, this->messageID, this->content);
  }

private:
  std::string originalMessageID;
  std::string messageID;
  std::string content;
};

} // namespace comm
