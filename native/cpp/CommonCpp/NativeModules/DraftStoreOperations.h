#pragma once

#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

class UpdateDraftOperation : public DBOperationBase {
public:
  UpdateDraftOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : key{payload.getProperty(rt, "key").asString(rt).utf8(rt)},
        text{payload.getProperty(rt, "text").asString(rt).utf8(rt)} {
  }
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).updateDraft(this->key, this->text);
  }

private:
  std::string key;
  std::string text;
};

class MoveDraftOperation : public DBOperationBase {
public:
  MoveDraftOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : oldKey{payload.getProperty(rt, "oldKey").asString(rt).utf8(rt)},
        newKey{payload.getProperty(rt, "newKey").asString(rt).utf8(rt)} {
  }
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).moveDraft(this->oldKey, this->newKey);
  }

private:
  std::string oldKey;
  std::string newKey;
};

class RemoveAllDraftsOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllDrafts();
  }
};

class RemoveDraftsOperation : public DBOperationBase {
public:
  RemoveDraftsOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : idsToRemove{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->idsToRemove.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeDrafts(this->idsToRemove);
  }

private:
  std::vector<std::string> idsToRemove;
};

} // namespace comm
