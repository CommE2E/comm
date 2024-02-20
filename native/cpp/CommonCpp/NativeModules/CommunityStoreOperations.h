#pragma once

#include "../DatabaseManagers/entities/CommunityInfo.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class CommunityStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~CommunityStoreOperationBase(){};
};

class RemoveCommunitiesOperation : public CommunityStoreOperationBase {
public:
  RemoveCommunitiesOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeCommunities(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceCommunityOperation : public CommunityStoreOperationBase {
public:
  ReplaceCommunityOperation(CommunityInfo &&community)
      : community{std::move(community)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceCommunity(this->community);
  }

private:
  CommunityInfo community;
};

class RemoveAllCommunitiesOperation : public CommunityStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllCommunities();
  }
};

} // namespace comm
