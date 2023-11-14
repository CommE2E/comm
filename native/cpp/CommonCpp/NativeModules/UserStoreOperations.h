#pragma once

#include "../DatabaseManagers/entities/UserInfo.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class UserStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~UserStoreOperationBase(){};
};

class RemoveUsersOperation : public UserStoreOperationBase {
public:
  RemoveUsersOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeUsers(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceUserOperation : public UserStoreOperationBase {
public:
  ReplaceUserOperation(UserInfo &&user) : user{std::move(user)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceUser(this->user);
  }

private:
  UserInfo user;
};

class RemoveAllUsersOperation : public UserStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllUsers();
  }
};

} // namespace comm
