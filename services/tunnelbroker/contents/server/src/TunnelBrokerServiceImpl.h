#pragma once

#include <memory>
#include <string>

#include <folly/concurrency/ConcurrentHashMap.h>

#include <grpcpp/grpcpp.h>

#include "../_generated/tunnelbroker.grpc.pb.h"
#include "../_generated/tunnelbroker.pb.h"

#include "Tools.h"

namespace comm {
namespace network {

class TunnelBrokerServiceImpl final
    : public tunnelbroker::TunnelBrokerService::Service {
  folly::ConcurrentHashMap<std::string, std::shared_ptr<ping::ClientData>>
      primaries;

public:
  grpc::Status
  CheckIfPrimaryDeviceOnline(grpc::ServerContext *context,
                             const tunnelbroker::CheckRequest *request,
                             tunnelbroker::CheckResponse *response) override;
  grpc::Status
  BecomeNewPrimaryDevice(grpc::ServerContext *context,
                         const tunnelbroker::NewPrimaryRequest *request,
                         tunnelbroker::NewPrimaryResponse *response) override;
  grpc::Status SendPong(grpc::ServerContext *context,
                        const tunnelbroker::PongRequest *request,
                        tunnelbroker::PongResponse *response) override;
};

} // namespace network
} // namespace comm
