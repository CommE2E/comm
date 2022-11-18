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
