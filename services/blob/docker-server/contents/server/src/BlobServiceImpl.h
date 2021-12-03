#pragma once

#include "AwsStorageManager.h"
#include "Tools.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <aws/core/Aws.h>

#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace comm {
namespace network {

class BlobServiceImpl final : public blob::BlobService::Service {
  const std::string bucketName = "commapp-blob";

  std::unique_ptr<AwsStorageManager> storageManager;

public:
  BlobServiceImpl();
  virtual ~BlobServiceImpl();

  grpc::Status Put(grpc::ServerContext *context,
                   grpc::ServerReader<blob::PutRequest> *reader,
                   blob::PutResponse *response);
  grpc::Status Get(grpc::ServerContext *context,
                   const blob::GetRequest *request,
                   grpc::ServerWriter<blob::GetResponse> *writer);
  grpc::Status Remove(grpc::ServerContext *context,
                      const blob::RemoveRequest *request,
                      google::protobuf::Empty *response);
};

} // namespace network
} // namespace comm
