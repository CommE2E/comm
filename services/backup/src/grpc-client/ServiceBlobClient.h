#pragma once

#include "TalkBetweenServicesReactor.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>

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

  void talk(std::shared_ptr<reactor::TalkBetweenServicesReactor> talkReactor) {
    if (talkReactor == nullptr) {
      throw std::runtime_error(
          "talk reactor is being used but has not been initialized");
    }
    blob::BlobService::NewStub(this->channel)
        ->async()
        ->TalkBetweenServices(&talkReactor->context, &(*talkReactor));
    talkReactor->start();
  }
};

} // namespace network
} // namespace comm
