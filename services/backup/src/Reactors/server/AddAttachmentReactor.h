#pragma once

#include "DatabaseEntitiesTools.h"
#include "ServerReadReactorBase.h"
#include "ServiceBlobClient.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <memory>
#include <string>
#include <vector>

namespace comm {
namespace network {
namespace reactor {

class AddAttachmentReactor : public ServerReadReactorBase<
                                 backup::AddAttachmentRequest,
                                 google::protobuf::Empty> {
  enum class ParentType {
    UNKNOWN = 0,
    BACKUP = 1,
    LOG = 2,
  };

  ParentType parentType = ParentType::UNKNOWN;
  std::string userID;
  std::string backupID;
  std::string logID;
  bool parametersPassed = false;
  std::mutex reactorStateMutex;
  std::vector<std::string> holders;

  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;

public:
  using ServerReadReactorBase<
      backup::AddAttachmentRequest,
      google::protobuf::Empty>::ServerReadReactorBase;

  std::unique_ptr<grpc::Status>
  readRequest(backup::AddAttachmentRequest request) override;
  void terminateCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
