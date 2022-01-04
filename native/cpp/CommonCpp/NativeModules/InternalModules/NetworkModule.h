#pragma once

#include "../../grpc/Client.h"
#include <memory>
#include <string>

namespace comm {
class NetworkModule {
  std::unique_ptr<network::Client> networkClient;
  bool closed = false;

public:
  void initializeNetworkModule(
      const std::string &userId,
      const std::string &deviceToken,
      const std::string &hostname = "");
  void sendPong();
  void close();
};
} // namespace comm
