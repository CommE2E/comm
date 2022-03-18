#pragma once

#include "BlobPutClientReactor.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {

class ServiceBlobClient {
  std::unique_ptr<blob::BlobService::Stub> stub;

  ServiceBlobClient() {
    std::string targetStr = "blob-server:50051";
    std::shared_ptr<grpc::Channel> channel =
        grpc::CreateChannel(targetStr, grpc::InsecureChannelCredentials());
    this->stub = blob::BlobService::NewStub(channel);
  }

public:
  static ServiceBlobClient &getInstance() {
    // todo consider threads
    static ServiceBlobClient instance;
    return instance;
  }

  std::unique_ptr<reactor::BlobPutClientReactor> putReactor;

  void put(const std::string &holder, const std::string &hash) {
    std::cout << "blob client - put initialize" << std::endl;
    if (this->putReactor != nullptr && !this->putReactor->isDone()) {
      throw std::runtime_error(
          "trying to run reactor while the previous one is not finished yet");
    }
    this->putReactor.reset(new reactor::BlobPutClientReactor(holder, hash));
    this->stub->async()->Put(&this->putReactor->context, &(*this->putReactor));
    this->putReactor->nextWrite();
  }
  // void get(const std::string &holder);
  // void remove(const std::string &holder);
};

} // namespace network
} // namespace comm
