#pragma once

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <aws/core/Aws.h>

#include <grpcpp/grpcpp.h>

#include <string>

namespace comm {
namespace network {

class BlobServiceImpl final : public blob::BlobService::CallbackService {
public:
  BlobServiceImpl();
  virtual ~BlobServiceImpl();

  grpc::ServerBidiReactor<blob::TalkBetweenServicesRequest, blob::TalkBetweenServicesResponse> *
  TalkBetweenServices(grpc::CallbackServerContext *context) override;
};

} // namespace network
} // namespace comm
