#include "Client.h"
#include "Logger.h"

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

tunnelbroker::CheckResponseType Client::checkIfPrimaryDeviceOnline() {
  grpc::ClientContext context;
  tunnelbroker::CheckRequest request;
  tunnelbroker::CheckResponse response;

  request.set_userid(this->id);
  request.set_devicetoken(this->deviceToken);

  grpc::Status status =
      stub_->CheckIfPrimaryDeviceOnline(&context, request, &response);
  if (!status.ok()) {
    throw std::runtime_error(status.error_message());
  }
  return response.checkresponsetype();
}

bool Client::becomeNewPrimaryDevice() {
  grpc::ClientContext context;
  tunnelbroker::NewPrimaryRequest request;
  tunnelbroker::NewPrimaryResponse response;

  request.set_userid(this->id);
  request.set_devicetoken(this->deviceToken);

  grpc::Status status =
      stub_->BecomeNewPrimaryDevice(&context, request, &response);
  if (!status.ok()) {
    throw std::runtime_error(status.error_message());
  }
  return response.success();
}

void Client::sendPong() {
  grpc::ClientContext context;
  tunnelbroker::PongRequest request;
  google::protobuf::Empty response;

  request.set_userid(this->id);
  request.set_devicetoken(this->deviceToken);

  grpc::Status status = stub_->SendPong(&context, request, &response);
  if (!status.ok()) {
    throw std::runtime_error(status.error_message());
  }
}

} // namespace network
} // namespace comm
