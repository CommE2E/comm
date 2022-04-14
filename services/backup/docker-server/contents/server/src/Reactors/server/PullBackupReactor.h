#pragma once

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include "BlobGetClientReactor.h"
#include "DatabaseEntitiesTools.h"
#include "ServerWriteReactorBase.h"
#include "ServiceBlobClient.h"

#include <folly/MPMCQueue.h>

#include <memory>
#include <string>
#include <vector>

namespace comm {
namespace network {
namespace reactor {

class PullBackupReactor : public ServerWriteReactorBase<
                              backup::PullBackupRequest,
                              backup::PullBackupResponse> {

  enum class State {
    COMPACTION = 1,
    LOGS = 2,
  };

  std::shared_ptr<database::BackupItem> backupItem;
  std::shared_ptr<reactor::BlobGetClientReactor> getReactor;
  std::mutex reactorStateMutex;
  std::shared_ptr<folly::MPMCQueue<std::string>> dataChunks;
  ServiceBlobClient blobClient;
  State state = State::COMPACTION;
  std::vector<std::shared_ptr<database::LogItem>> logs;
  size_t currentLogIndex = 0;
  std::shared_ptr<database::LogItem> currentLog;

  void initializeGetReactor(const std::string &holder);

public:
  PullBackupReactor(const backup::PullBackupRequest *request);

  void initialize() override;

  std::unique_ptr<grpc::Status>
  writeResponse(backup::PullBackupResponse *response) override;
  void terminateCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
