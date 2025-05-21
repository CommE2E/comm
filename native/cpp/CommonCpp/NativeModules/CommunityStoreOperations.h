#pragma once

#include "../DatabaseManagers/entities/CommunityInfo.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveCommunitiesOperation : public DBOperationBase {
public:
  RemoveCommunitiesOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeCommunities(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceCommunityOperation : public DBOperationBase {
public:
  ReplaceCommunityOperation(CommunityInfo &&community)
      : community{std::move(community)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceCommunity(this->community);
  }

private:
  CommunityInfo community;
};

class RemoveAllCommunitiesOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllCommunities();
  }
};

} // namespace comm
