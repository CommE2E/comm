#pragma once

#include "ServerBidiReactorBase.h"
#include "TalkBetweenServicesReactor.h"
#include "TalkWithClientReactor.h"
#include "ServiceBlobClient.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <grpcpp/grpcpp.h>

#include <memory>
#include <condition_variable>
#include <mutex>
#include <string>

namespace comm {
namespace network {

class BackupServiceImpl final : public backup::BackupService::CallbackService {

public:
  BackupServiceImpl();
  virtual ~BackupServiceImpl();

  grpc::ServerBidiReactor<
      backup::TalkWithClientRequest,
      backup::TalkWithClientResponse> *
  TalkWithClient(grpc::CallbackServerContext *context) override;
};

} // namespace network
} // namespace comm
