#pragma once

#include "../DatabaseManagers/entities/Holder.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class RemoveHoldersOperation : public DBOperationBase {
public:
  RemoveHoldersOperation(std::vector<std::string> hashes) : hashes{hashes} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeHolders(this->hashes);
  }

private:
  std::vector<std::string> hashes;
};

class ReplaceHoldersOperation : public DBOperationBase {
public:
  ReplaceHoldersOperation(std::vector<Holder> &&holders)
      : holders{std::move(holders)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    for (auto holder : this->holders) {
      DatabaseManager::getQueryExecutor(id).replaceHolder(holder);
    }
  }

private:
  std::vector<Holder> holders;
};

} // namespace comm
