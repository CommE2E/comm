#pragma once

#include "LogItem.h"
#include "ServerReadReactorBase.h"

#include "backup.grpc.pb.h"
#include "backup.pb.h"

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class SendLogReactor : public ServerReadReactorBase<
                           backup::SendLogRequest,
                           backup::SendLogResponse> {
  enum class State {
    USER_ID = 1,
    BACKUP_ID = 2,
    LOG_HASH = 3,
    LOG_CHUNK = 4,
  };

  enum class PersistenceMethod {
    UNKNOWN = 0,
    DB = 1,
    BLOB = 2,
  };

  State state = State::USER_ID;
  PersistenceMethod persistenceMethod = PersistenceMethod::UNKNOWN;
  std::string userID;
  std::string logID;
  std::string backupID;
  std::string hash;
  std::string blobHolder;
  std::string value;
  std::mutex reactorStateMutex;

  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;

  void storeInDatabase();
  std::string generateLogID(const std::string &backupID);
  void initializePutClient();

public:
  using ServerReadReactorBase<backup::SendLogRequest, backup::SendLogResponse>::
      ServerReadReactorBase;

  std::unique_ptr<grpc::Status>
  readRequest(backup::SendLogRequest request) override;
  void doneCallback() override;
  void terminateCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
