#pragma once

#include "GlobalConstants.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include "ClientBidiReactorBase.h"

#include <folly/MPMCQueue.h>
#include <grpcpp/grpcpp.h>

#include <condition_variable>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class TalkBetweenServicesReactor
    : public ClientBidiReactorBase<blob::TalkBetweenServicesRequest, blob::TalkBetweenServicesResponse> {

  std::condition_variable *terminationNotifier;
  folly::MPMCQueue<std::string> messages;

public:
  TalkBetweenServicesReactor(std::condition_variable *terminationNotifier);
  void scheduleMessage(std::unique_ptr<std::string> msg);
  std::unique_ptr<grpc::Status> prepareRequest(
      blob::TalkBetweenServicesRequest &request,
      std::shared_ptr<blob::TalkBetweenServicesResponse> previousResponse) override;
  void doneCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
