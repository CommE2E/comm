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

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeKeyservers(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceKeyserverOperation : public DBOperationBase {
public:
  ReplaceKeyserverOperation(KeyserverInfo &&keyserver)
      : keyserver{std::move(keyserver)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceKeyserver(this->keyserver);
  }

private:
  KeyserverInfo keyserver;
};

class RemoveAllKeyserversOperation : public DBOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllKeyservers();
  }
};

} // namespace comm
