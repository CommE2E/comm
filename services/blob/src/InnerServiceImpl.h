#pragma once

#include "../_generated/inner.grpc.pb.h"
#include "../_generated/inner.pb.h"

#include <aws/core/Aws.h>

#include <grpcpp/grpcpp.h>

#include <string>

namespace comm {
namespace network {

class InnerServiceImpl final : public inner::InnerService::CallbackService {
public:
  InnerServiceImpl();
  virtual ~InnerServiceImpl();

  grpc::ServerBidiReactor<
      inner::TalkBetweenServicesRequest,
      inner::TalkBetweenServicesResponse> *
  TalkBetweenServices(grpc::CallbackServerContext *context) override;
};

} // namespace network
} // namespace comm
