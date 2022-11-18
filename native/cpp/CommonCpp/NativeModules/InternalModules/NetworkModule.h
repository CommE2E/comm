#pragma once

#include "../../grpc/Client.h"
#include "SocketStatus.h"
#include <memory>
#include <string>

namespace comm {
class NetworkModule {
  std::unique_ptr<network::Client> networkClient;

public:
  void initializeNetworkModule(
      const std::string &userId,
      const std::string &deviceToken,
      const std::string &hostname = "");
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
} // namespace comm
