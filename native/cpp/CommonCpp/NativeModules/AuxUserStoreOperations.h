#pragma once

#include "../DatabaseManagers/entities/AuxUserInfo.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveAuxUserInfosOperation : public DBOperationBase {
public:
  RemoveAuxUserInfosOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).removeAuxUserInfos(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceAuxUserInfoOperation : public DBOperationBase {
public:
  ReplaceAuxUserInfoOperation(AuxUserInfo &&auxUserInfo)
      : auxUserInfo{std::move(auxUserInfo)} {
  }

  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).replaceAuxUserInfo(this->auxUserInfo);
  }

private:
  AuxUserInfo auxUserInfo;
};

class RemoveAllAuxUserInfosOperation : public DBOperationBase {
public:
  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).removeAllAuxUserInfos();
  }
};

} // namespace comm
