#pragma once

#include "../DatabaseManagers/entities/Media.h"
#include "../DatabaseManagers/entities/Thread.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class ThreadStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~ThreadStoreOperationBase(){};
};

class RemoveThreadsOperation : public ThreadStoreOperationBase {
public:
  RemoveThreadsOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeThreads(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceThreadOperation : public ThreadStoreOperationBase {
public:
  ReplaceThreadOperation(Thread &&thread) : thread{std::move(thread)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceThread(this->thread);
  }

private:
  Thread thread;
};

class RemoveAllThreadsOperation : public ThreadStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllThreads();
  }
};

} // namespace comm
