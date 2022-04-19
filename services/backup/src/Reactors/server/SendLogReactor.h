#pragma once

#include "ServerReadReactorBase.h"
#include "ServiceBlobClient.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class SendLogReactor : public ServerReadReactorBase<
                           backup::SendLogRequest,
                           google::protobuf::Empty> {
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
  std::string backupID;
  std::string hash;
  // either the value itself which is a dump of a single operation (if
  // `persistedInBlob` is false) or the holder to blob (if `persistedInBlob` is
  // true)
  std::string value;
  std::mutex reactorStateMutex;

  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;

  std::condition_variable blobAppendHolderDoneCV;
  std::mutex blobAppendHolderDoneCVMutex;

  std::shared_ptr<reactor::BlobPutClientReactor> putReactor;
  std::shared_ptr<reactor::BlobAppendHolderClientReactor> holderReactor;
  ServiceBlobClient blobClient;

  void storeInDatabase();
  std::string generateHolder();
  std::string generateLogID();
  void initializePutReactor();
  void initializeHolderReactor();

public:
  using ServerReadReactorBase<backup::SendLogRequest, google::protobuf::Empty>::
      ServerReadReactorBase;

  std::unique_ptr<grpc::Status>
  readRequest(backup::SendLogRequest request) override;
  void doneCallback() override;
  void terminateCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
