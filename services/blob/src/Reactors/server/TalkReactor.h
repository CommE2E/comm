#pragma once

#include "ServerBidiReactorBase.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <glog/logging.h>

#include <chrono>
#include <memory>
#include <string>
#include <thread>

namespace comm {
namespace network {
namespace reactor {

class TalkReactor : public ServerBidiReactorBase<
                        blob::TalkBetweenServicesRequest,
                        blob::TalkBetweenServicesResponse> {
public:
  std::unique_ptr<ServerBidiReactorStatus> handleRequest(
      blob::TalkBetweenServicesRequest request,
      blob::TalkBetweenServicesResponse *response) override {
    std::string msg = request.msg();
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkReactor::handleRequest] processING msg " << msg.size();
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkReactor::handleRequest] processED msg " << msg.size();
    return nullptr;
  }

  void terminateCallback() override {
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkReactor::terminateCallback]";
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
