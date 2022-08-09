#pragma once

#include "ServiceBlobClient.h"

#include "backup.grpc.pb.h"
#include "backup.pb.h"

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
    DEVICE_ID = 2,
    KEY_ENTROPY = 3,
    DATA_HASH = 4,
    DATA_CHUNKS = 5,
  };

  State state = State::USER_ID;
  std::string userID;
  std::string deviceID;
  std::string keyEntropy;
  std::string dataHash;
  std::string holder;
  std::string backupID;
  std::shared_ptr<reactor::BlobPutClientReactor> putReactor;

  ServiceBlobClient blobClient;
  std::mutex reactorStateMutex;

  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;

  std::string generateBackupID();

public:
  std::unique_ptr<ServerBidiReactorStatus> handleRequest(
      backup::CreateNewBackupRequest request,
      backup::CreateNewBackupResponse *response) override;
  void terminateCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
