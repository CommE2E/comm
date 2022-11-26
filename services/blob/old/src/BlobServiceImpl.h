#pragma once

#include "S3Path.h"

#include <blob.grpc.pb.h>
#include <blob.pb.h>

#include <aws/core/Aws.h>

#include <grpcpp/grpcpp.h>

#include <string>

namespace comm {
namespace network {

class BlobServiceImpl final : public blob::BlobService::CallbackService {
  void verifyBlobHash(
      const std::string &expectedBlobHash,
      const database::S3Path &s3Path);
  void assignVariableIfEmpty(
      const std::string &label,
      std::string &lvalue,
      const std::string &rvalue);

public:
  BlobServiceImpl();
  virtual ~BlobServiceImpl();

  grpc::ServerBidiReactor<blob::PutRequest, blob::PutResponse> *
  Put(grpc::CallbackServerContext *context) override;
  grpc::ServerWriteReactor<blob::GetResponse> *
  Get(grpc::CallbackServerContext *context,
      const blob::GetRequest *request) override;
  grpc::ServerUnaryReactor *Remove(
      grpc::CallbackServerContext *context,
      const blob::RemoveRequest *request,
      google::protobuf::Empty *response) override;
};

} // namespace network
} // namespace comm
