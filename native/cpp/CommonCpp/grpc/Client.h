#pragma once

#include <memory>
#include <string>

#include <grpcpp/grpcpp.h>

#include "tunnelbroker.grpc.pb.h"
#include "tunnelbroker.pb.h"

namespace comm {
namespace network {

using grpc::Channel;
using tunnelbroker::TunnelbrokerService;

class Client {
  std::unique_ptr<TunnelbrokerService::Stub> stub_;
  const std::string id;
  const std::string deviceToken;

public:
  Client(
      std::string hostname,
      std::string port,
      std::shared_ptr<grpc::ChannelCredentials> credentials,
      const std::string id,
      const std::string deviceToken);

  std::string sessionSignature(std::string deviceID);
  std::string newSession(
      std::string deviceID,
      std::string publicKey,
      std::string signature,
      std::string notifyToken,
      tunnelbroker::NewSessionRequest_DeviceTypes deviceType,
      std::string deviceAppVersion,
      std::string deviceOS);
};

} // namespace network
} // namespace comm
