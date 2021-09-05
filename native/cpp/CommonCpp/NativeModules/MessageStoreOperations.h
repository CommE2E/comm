#include "DatabaseManager.h"
#include "Message.h"
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
  RemoveMessagesOperation(std::vector<int> ids) : ids_{ids} {
  }
  virtual ~RemoveMessagesOperation() = default;

  void virtual execute() override {
    DatabaseManager::getQueryExecutor().removeMessages(ids_);
  }

private:
  std::vector<int> ids_;
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
  ReplaceMessageOperation(Message msg) : msg_{msg} {
  }
  virtual ~ReplaceMessageOperation() = default;

  void virtual execute() override {
    DatabaseManager::getQueryExecutor().replaceMessage(msg_);
  }

private:
  Message msg_;
};

} // namespace comm
