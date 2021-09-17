#pragma once

#include "../DatabaseManagers/entities/Message.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class MessageStoreOperationBase {
public:
  MessageStoreOperationBase() = default;
  virtual ~MessageStoreOperationBase() = default;

  void virtual execute() = 0;
};

class RemoveMessagesOperation : public MessageStoreOperationBase {
public:
  RemoveMessagesOperation(std::vector<std::string> ids) : ids_{ids} {
  }
  virtual ~RemoveMessagesOperation() = default;

  void virtual execute() override {
    DatabaseManager::getQueryExecutor().removeMessages(ids_);
  }

private:
  std::vector<std::string> ids_;
};

class RemoveMessagesForThreadsOperation : public MessageStoreOperationBase {
public:
  RemoveMessagesForThreadsOperation(std::vector<int> ids) : ids_{ids} {
  }
  virtual ~RemoveMessagesForThreadsOperation() = default;

  void virtual execute() override {
    DatabaseManager::getQueryExecutor().removeMessagesForThreads(ids_);
  }

private:
  std::vector<int> ids_;
};

class ReplaceMessageOperation : public MessageStoreOperationBase {
public:
  ReplaceMessageOperation(Message msg) : msg_{std::move(msg)} {
  }
  virtual ~ReplaceMessageOperation() = default;

  void virtual execute() override {
    DatabaseManager::getQueryExecutor().replaceMessage(msg_);
  }

private:
  Message msg_;
};

class RekeyMessageOperation : public MessageStoreOperationBase {
public:
  RekeyMessageOperation(std::string from, std::string to)
      : from_{from}, to_{to} {
  }
  virtual ~RekeyMessageOperation() = default;

  void virtual execute() override {
    DatabaseManager::getQueryExecutor().rekeyMessage(from_, to_);
  }

private:
  std::string from_;
  std::string to_;
};

} // namespace comm
