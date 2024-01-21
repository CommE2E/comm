#pragma once

#include "../DatabaseManagers/entities/KeyserverInfo.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class KeyserverStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~KeyserverStoreOperationBase(){};
};

class RemoveKeyserverOperation : public KeyserverStoreOperationBase {
public:
  RemoveKeyserverOperation(const std::string id) : id{id} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeKeyserver(this->id);
  }

private:
  std::string id;
};

class ReplaceKeyserverOperation : public KeyserverStoreOperationBase {
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

class RemoveAllKeyserversOperation : public KeyserverStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllKeyservers();
  }
};

} // namespace comm
