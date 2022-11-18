#include "NetworkModule.h"
#include "Logger.h"

namespace comm {
void NetworkModule::initializeNetworkModule(
    const std::string &userId,
    const std::string &deviceToken,
    const std::string &hostname) {
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

void NetworkModule::get(std::string sessionID) {
  if (!this->networkClient) {
    return;
  }
  this->networkClient->get(sessionID);
}

void NetworkModule::close() {
  this->networkClient.reset();
}

grpc::Status NetworkModule::send(
    std::string sessionID,
    std::string toDeviceID,
    std::string payload,
    std::vector<std::string> blobHashes) {

  if (!this->networkClient) {
    return grpc::Status::CANCELLED;
  }
  return this->networkClient->send(sessionID, toDeviceID, payload, blobHashes);
}

void NetworkModule::setOnReadDoneCallback(
    std::function<void(std::string)> callback) {
  if (!this->networkClient) {
    return;
  }
  this->networkClient->setOnReadDoneCallback(callback);
}

void NetworkModule::setOnOpenCallback(std::function<void()> callback) {
  if (!this->networkClient) {
    return;
  }
  this->networkClient->setOnOpenCallback(callback);
}

void NetworkModule::setOnCloseCallback(std::function<void()> callback) {
  if (!this->networkClient) {
    return;
  }
  this->networkClient->setOnCloseCallback(callback);
}

void NetworkModule::closeGetStream() {
  if (!this->networkClient) {
    return;
  }
  this->networkClient->closeGetStream();
}

void NetworkModule::assignSetReadyStateCallback(
    std::function<void(SocketStatus)> callback) {
  if (!this->networkClient) {
    return;
  }
  this->networkClient->assignSetReadyStateCallback(callback);
}

std::string NetworkModule::sessionSignature(std::string deviceID) {
  if (!this->networkClient) {
    return std::string{};
  }
  return this->networkClient->sessionSignature(deviceID);
}

std::string NetworkModule::newSession(
    std::string deviceID,
    std::string publicKey,
    std::string signature,
    std::string notifyToken,
    tunnelbroker::NewSessionRequest_DeviceTypes deviceType,
    std::string deviceAppVersion,
    std::string deviceOS) {
  if (!this->networkClient) {
    return std::string{};
  }
  return this->networkClient->newSession(
      deviceID,
      publicKey,
      signature,
      notifyToken,
      deviceType,
      deviceAppVersion,
      deviceOS);
}

} // namespace comm
