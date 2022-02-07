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

  Logger::log("Sending PONG");
  grpc::Status status = this->stub_->SendPong(&context, request, &response);
  if (!status.ok()) {
    std::ostringstream errorMsg;
    errorMsg << "Sending PONG failed: " << status.error_message() << std::endl;
    Logger::log(errorMsg.str());
  }
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

} // namespace network
} // namespace comm
