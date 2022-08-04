#pragma once

#include "ServerBidiReactorBase.h"
#include "ServiceBlobClient.h"
#include "TalkBetweenServicesReactor.h"
#include "TalkWithClientReactor.h"

#include "../_generated/outer.grpc.pb.h"
#include "../_generated/outer.pb.h"

#include <grpcpp/grpcpp.h>

#include <condition_variable>
#include <memory>
#include <mutex>
#include <string>

namespace comm {
namespace network {

class OuterServiceImpl final : public outer::OuterService::CallbackService {

public:
  OuterServiceImpl();
  virtual ~OuterServiceImpl();

  grpc::ServerBidiReactor<
      outer::TalkWithClientRequest,
      outer::TalkWithClientResponse> *
  TalkWithClient(grpc::CallbackServerContext *context) override;
};

} // namespace network
} // namespace comm
