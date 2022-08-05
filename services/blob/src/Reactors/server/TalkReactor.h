#pragma once

#include "ServerBidiReactorBase.h"

#include "../_generated/inner.grpc.pb.h"
#include "../_generated/inner.pb.h"

#include <chrono>
#include <iostream>
#include <memory>
#include <string>
#include <thread>

namespace comm {
namespace network {
namespace reactor {

class TalkReactor : public ServerBidiReactorBase<
                        inner::TalkBetweenServicesRequest,
                        inner::TalkBetweenServicesResponse> {
public:
  std::unique_ptr<ServerBidiReactorStatus> handleRequest(
      inner::TalkBetweenServicesRequest request,
      inner::TalkBetweenServicesResponse *response) override {
    std::string msg = request.msg();
    std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkReactor::handleRequest] processING msg " << msg.size()
              << std::endl;
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkReactor::handleRequest] processED msg " << msg.size()
              << std::endl;
    return nullptr;
  }

  void terminateCallback() override {
    std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkReactor::terminateCallback]" << std::endl;
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
