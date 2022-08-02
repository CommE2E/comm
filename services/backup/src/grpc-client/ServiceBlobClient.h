#pragma once

#include "BlobGetClientReactor.h"
#include "BlobPutClientReactor.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

class ServiceBlobClient {
  // std::unique_ptr<blob::BlobService::Stub> stub;
  std::shared_ptr<grpc::Channel> channel;

  ServiceBlobClient() {
    // todo handle different types of connection(e.g. load balancer)
    std::string targetStr = "blob-server:50051";
    this->channel =
        grpc::CreateChannel(targetStr, grpc::InsecureChannelCredentials());
    // this->stub = blob::BlobService::NewStub(channel);
  }

public:
  static ServiceBlobClient &getInstance() {
    static ServiceBlobClient instance;
    return instance;
  }

  void put(std::shared_ptr<reactor::BlobPutClientReactor> putReactor) {
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[ServiceBlobClient::put] " << this;
    if (putReactor == nullptr) {
      throw std::runtime_error(
          "put reactor is being used but has not been initialized");
    }
    blob::BlobService::NewStub(this->channel)
        ->async()
        ->Put(&putReactor->context, &(*putReactor));
    putReactor->start();
  }

  void get(std::shared_ptr<reactor::BlobGetClientReactor> getReactor) {
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[ServiceBlobClient::get] " << this;
    if (getReactor == nullptr) {
      throw std::runtime_error(
          "get reactor is being used but has not been initialized");
    }
    blob::BlobService::NewStub(this->channel)
        ->async()
        ->Get(&getReactor->context, &getReactor->request, &(*getReactor));
    getReactor->start();
  }
  // void remove(const std::string &holder);
};

} // namespace network
} // namespace comm
