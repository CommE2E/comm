#pragma once

#include "BlobGetClientReactor.h"
#include "BlobPutClientReactor.h"

#include <blob.grpc.pb.h>
#include <blob.pb.h>

#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

class ServiceBlobClient {
  std::unique_ptr<blob::BlobService::Stub> stub;

public:
  ServiceBlobClient() {
    // todo handle different types of connection(e.g. load balancer)
    std::string targetStr = "blob-server:50051";
    std::shared_ptr<grpc::Channel> channel =
        grpc::CreateChannel(targetStr, grpc::InsecureChannelCredentials());
    this->stub = blob::BlobService::NewStub(channel);
  }

  void put(std::shared_ptr<reactor::BlobPutClientReactor> putReactor) {
    if (putReactor == nullptr) {
      throw std::runtime_error(
          "put reactor is being used but has not been initialized");
    }
    this->stub->async()->Put(&putReactor->context, &(*putReactor));
    putReactor->start();
  }

  void get(std::shared_ptr<reactor::BlobGetClientReactor> getReactor) {
    if (getReactor == nullptr) {
      throw std::runtime_error(
          "get reactor is being used but has not been initialized");
    }
    this->stub->async()->Get(
        &getReactor->context, &getReactor->request, &(*getReactor));
    getReactor->start();
  }
  // void remove(const std::string &holder);
};

} // namespace network
} // namespace comm
