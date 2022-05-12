#pragma once

#include "ServiceBlobClient.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include "ServerBidiReactorBase.h"

#include <condition_variable>
#include <memory>
#include <mutex>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class CreateNewBackupReactor : public ServerBidiReactorBase<
                                   backup::CreateNewBackupRequest,
                                   backup::CreateNewBackupResponse> {
  enum class State {
    USER_ID = 1,
    KEY_ENTROPY = 2,
    DATA_HASH = 3,
    DATA_CHUNKS = 4,
  };

  State state = State::USER_ID;
  std::string userID;
  std::string keyEntropy;
  std::string dataHash;
  std::string holder;
  std::string backupID;
  uint64_t created;
  std::shared_ptr<reactor::BlobPutClientReactor> putReactor;

  ServiceBlobClient blobClient;
  std::mutex reactorStateMutex;

  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;

  std::string generateBackupID(const std::string &userID);

public:
  std::unique_ptr<ServerBidiReactorStatus> handleRequest(
      backup::CreateNewBackupRequest request,
      backup::CreateNewBackupResponse *response) override;
  void terminateCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
