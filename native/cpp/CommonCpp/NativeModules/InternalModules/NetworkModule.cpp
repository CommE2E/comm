#include "NetworkModule.h"
#include "Logger.h"

namespace comm {
void NetworkModule::initializeNetworkModule(
    const std::string &userId,
    const std::string &deviceToken,
    const std::string &hostname) {
  if (closed) {
    throw std::runtime_error("initializing closed network module");
  }
  std::string host = (hostname.size() == 0) ? "localhost" : hostname;
  // initialize network module
  // this is going to differ depending on a device
  // 10.0.2.2 for android emulator
  // 192.168.x.x for a physical device etc
  const std::shared_ptr<grpc::ChannelCredentials> credentials =
      (host.substr(0, 5) == "https")
      ? grpc::SslCredentials(grpc::SslCredentialsOptions())
      : grpc::InsecureChannelCredentials();
  this->networkClient.reset(
      new network::Client(host, "50051", credentials, userId, deviceToken));
}

void NetworkModule::sendPong() {
  Logger::log("Sending PONG");
}

void NetworkModule::close() {
  networkClient.reset();
  this->closed = true;
}
} // namespace comm
