#pragma once

#include "../_generated/inner.grpc.pb.h"
#include "../_generated/inner.pb.h"

#include "ClientBidiReactorBase.h"

#include <folly/MPMCQueue.h>
#include <grpcpp/grpcpp.h>

#include <condition_variable>
#include <memory>
#include <string>
#include <thread>

namespace comm {
namespace network {
namespace reactor {

class TalkBetweenServicesReactor : public ClientBidiReactorBase<
                                       inner::TalkBetweenServicesRequest,
                                       inner::TalkBetweenServicesResponse> {
  folly::MPMCQueue<std::string> messages;

public:
  std::condition_variable *terminationNotifier;
  bool initialized;

  TalkBetweenServicesReactor() : initialized(false) {
  }

  TalkBetweenServicesReactor(std::condition_variable *terminationNotifier)
      : messages(folly::MPMCQueue<std::string>(100)),
        terminationNotifier(terminationNotifier),
        initialized(true) {
  }

  TalkBetweenServicesReactor
  operator=(const TalkBetweenServicesReactor &other) {
    if (this == &other) {
      return *this;
    }
    this->terminationNotifier = other.terminationNotifier;
    this->initialized = true;
    this->messages = folly::MPMCQueue<std::string>(100);
    return *this;
  }
  TalkBetweenServicesReactor(const TalkBetweenServicesReactor &other) {
    this->terminationNotifier = other.terminationNotifier;
    this->initialized = true;
    this->messages = folly::MPMCQueue<std::string>(100);
  }

  void scheduleMessage(std::unique_ptr<std::string> msg);
  std::unique_ptr<grpc::Status> prepareRequest(
      inner::TalkBetweenServicesRequest &request,
      std::shared_ptr<inner::TalkBetweenServicesResponse> previousResponse)
      override;
  void doneCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
