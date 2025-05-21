#pragma once

#include "../DatabaseManagers/entities/KeyserverInfo.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveKeyserversOperation : public DBOperationBase {
public:
  RemoveKeyserversOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeKeyservers(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceKeyserverOperation : public DBOperationBase {
public:
  ReplaceKeyserverOperation(KeyserverInfo &&keyserver)
      : keyserver{std::move(keyserver)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceKeyserver(this->keyserver);
  }

private:
  KeyserverInfo keyserver;
};

class RemoveAllKeyserversOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllKeyservers();
  }
};

} // namespace comm
