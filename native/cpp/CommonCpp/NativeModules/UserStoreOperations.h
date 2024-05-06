#pragma once

#include "../DatabaseManagers/entities/UserInfo.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveUsersOperation : public DBOperationBase {
public:
  RemoveUsersOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeUsers(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceUserOperation : public DBOperationBase {
public:
  ReplaceUserOperation(UserInfo &&user) : user{std::move(user)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceUser(this->user);
  }

private:
  UserInfo user;
};

class RemoveAllUsersOperation : public DBOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllUsers();
  }
};

} // namespace comm
