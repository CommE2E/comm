#include "Client.h"
#include "Logger.h"
#include <sstream>

namespace comm {
namespace network {

Client::Client(
    std::string hostname,
    std::string port,
    std::shared_ptr<grpc::ChannelCredentials> credentials,
    const std::string id,
    const std::string deviceToken)
    : id(id), deviceToken(deviceToken) {
  std::shared_ptr<Channel> channel =
      grpc::CreateChannel(hostname + ":" + port, credentials);
  this->stub_ = TunnelbrokerService::NewStub(channel);
}

grpc::Status Client::send(
    std::string sessionID,
    std::string toDeviceID,
    std::string payload,
    std::vector<std::string> blobHashes) {
  grpc::ClientContext context;
  tunnelbroker::SendRequest request;
  google::protobuf::Empty response;

  request.set_sessionid(sessionID);
  request.set_todeviceid(toDeviceID);
  request.set_payload(payload);

  for (const auto &blob : blobHashes) {
    request.add_blobhashes(blob);
  }

  return this->stub_->Send(&context, request, &response);
}

void Client::get(std::string sessionID) {
  this->clientGetReadReactor =
      std::make_unique<ClientGetReadReactor>(this->stub_.get(), sessionID);
}

void Client::setOnReadDoneCallback(std::function<void(std::string)> callback) {
  if (!this->clientGetReadReactor) {
    return;
  }
  this->clientGetReadReactor->setOnReadDoneCallback(callback);
}

void Client::setOnOpenCallback(std::function<void()> callback) {
  if (!this->clientGetReadReactor) {
    return;
  }
  this->clientGetReadReactor->setOnOpenCallback(callback);
}

void Client::setOnCloseCallback(std::function<void()> callback) {
  if (!this->clientGetReadReactor) {
    return;
  }
  this->clientGetReadReactor->setOnCloseCallback(callback);
}

void Client::closeGetStream() {
  if (!this->clientGetReadReactor) {
    return;
  }
  this->clientGetReadReactor->close();
}

void Client::assignSetReadyStateCallback(
    std::function<void(SocketStatus)> callback) {
  if (!this->clientGetReadReactor) {
    return;
  }
  this->clientGetReadReactor->assignSetReadyStateCallback(callback);
}

std::string Client::sessionSignature(std::string deviceID) {
  grpc::ClientContext context;
  tunnelbroker::SessionSignatureRequest request;
  tunnelbroker::SessionSignatureResponse response;

  request.set_deviceid(deviceID);
  auto status{this->stub_->SessionSignature(&context, request, &response)};
  if (!status.ok()) {
    return std::string{};
  }
  return response.tosign();
}

std::string Client::newSession(
    std::string deviceID,
    std::string publicKey,
    std::string signature,
    std::string notifyToken,
    tunnelbroker::NewSessionRequest_DeviceTypes deviceType,
    std::string deviceAppVersion,
    std::string deviceOS) {
  grpc::ClientContext context;
  tunnelbroker::NewSessionRequest request;
  tunnelbroker::NewSessionResponse response;

  request.set_deviceid(deviceID);
  request.set_publickey(publicKey);
  request.set_signature(signature);
  request.set_notifytoken(notifyToken);
  request.set_devicetype(deviceType);
  request.set_deviceappversion(deviceAppVersion);
  request.set_deviceos(deviceOS);

  auto status{this->stub_->NewSession(&context, request, &response)};
  if (!status.ok()) {
    return std::string{};
  }
  return response.sessionid();
}

} // namespace network
} // namespace comm
