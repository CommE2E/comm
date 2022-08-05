#pragma once

#include "TalkBetweenServicesReactor.h"

#include "../_generated/inner.grpc.pb.h"
#include "../_generated/inner.pb.h"

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <memory>
#include <string>
#include <thread>

namespace comm {
namespace network {

class ServiceBlobClient {
  std::shared_ptr<grpc::Channel> channel;

  ServiceBlobClient() {
    std::string targetStr = "blob-server:50051";
    this->channel =
        grpc::CreateChannel(targetStr, grpc::InsecureChannelCredentials());
  }

public:
  static ServiceBlobClient &getInstance() {
    static ServiceBlobClient instance;
    return instance;
  }

  std::thread talk(reactor::TalkBetweenServicesReactor &talkReactor) {
    std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[ServiceBlobClient::talk] etner" << std::endl;
    if (!talkReactor.initialized) {
      throw std::runtime_error(
          "talk reactor is being used but has not been initialized");
    }
    std::thread th([this, &talkReactor]() {
      std::cout << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[ServiceBlobClient::talk::lambda] startING" << std::endl;
      inner::InnerService::NewStub(this->channel)
          ->async() // this runs on the same thread, why??
          ->TalkBetweenServices(&talkReactor.context, &talkReactor);
      talkReactor.start();
      std::cout << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[ServiceBlobClient::talk::lambda] startED" << std::endl;
    });
    return th;
  }
};
} // namespace network
} // namespace comm
