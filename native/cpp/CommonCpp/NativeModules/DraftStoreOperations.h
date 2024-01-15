#pragma once

#include "DatabaseManager.h"
#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

class DraftStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~DraftStoreOperationBase(){};
};

class UpdateDraftOperation : public DraftStoreOperationBase {
public:
  UpdateDraftOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : key{payload.getProperty(rt, "key").asString(rt).utf8(rt)},
        text{payload.getProperty(rt, "text").asString(rt).utf8(rt)} {
  }
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().updateDraft(this->key, this->text);
  }

private:
  std::string key;
  std::string text;
};

class MoveDraftOperation : public DraftStoreOperationBase {
public:
  MoveDraftOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : oldKey{payload.getProperty(rt, "oldKey").asString(rt).utf8(rt)},
        newKey{payload.getProperty(rt, "newKey").asString(rt).utf8(rt)} {
  }
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().moveDraft(this->oldKey, this->newKey);
  }

private:
  std::string oldKey;
  std::string newKey;
};

class RemoveAllDraftsOperation : public DraftStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllDrafts();
  }
};

class RemoveDraftsOperation : public DraftStoreOperationBase {
public:
  RemoveDraftsOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : idsToRemove{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->idsToRemove.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeDrafts(this->idsToRemove);
  }

private:
  std::vector<std::string> idsToRemove;
};

} // namespace comm
