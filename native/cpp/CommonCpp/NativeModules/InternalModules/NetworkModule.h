#pragma once

#include "../../grpc/Client.h"
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
  void sendPong();
  grpc::Status send(
      std::string sessionID,
      std::string toDeviceID,
      std::string payload,
      std::vector<std::string> blobHashes);
  void close();
  void get(std::string sessionID);
  void setOnReadDoneCallback(std::function<void(std::string)> callback);
  void setOnOpenCallback(std::function<void()> callback);
  void setOnCloseCallback(std::function<void()> callback);
};
} // namespace comm
