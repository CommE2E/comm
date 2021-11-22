#include "TunnelBrokerServiceImpl.h"

#include <chrono>
#include <folly/stop_watch.h>

namespace comm {
namespace network {

using namespace std::chrono_literals;

grpc::Status TunnelBrokerServiceImpl::CheckIfPrimaryDeviceOnline(
    grpc::ServerContext *context, const tunnelbroker::CheckRequest *request,
    tunnelbroker::CheckResponse *response) {
  const std::string id = request->userid();
  const std::string deviceToken = request->devicetoken();

  auto iterator = primaries.find(id);

  if (iterator == primaries.end()) {
    response->set_checkresponsetype(
        tunnelbroker::CheckResponseType::PRIMARY_DOESNT_EXIST);
  } else if (deviceToken == iterator->second->deviceToken) {
    response->set_checkresponsetype(
        tunnelbroker::CheckResponseType::CURRENT_IS_PRIMARY);
  } else {
    // TODO: the background notif should be sent what cannot be really
    // simulated here I believe
    iterator->second->pingRequests.blockingWrite(true);
    // TODO: timeout currently set for 3s, to be changed
    const auto wait = std::chrono::seconds(3);
    folly::stop_watch<> watch;
    bool isActive;
    bool responseReceived = iterator->second->pingResponses.tryReadUntil(
        watch.getCheckpoint() + wait, isActive);
    if (responseReceived) {
      iterator->second->lastState = ping::ClientState::ONLINE;
      response->set_checkresponsetype(
          tunnelbroker::CheckResponseType::PRIMARY_ONLINE);
    } else {
      iterator->second->lastState = ping::ClientState::OFFLINE;
      response->set_checkresponsetype(
          tunnelbroker::CheckResponseType::PRIMARY_OFFLINE);
    }
  }

  return grpc::Status::OK;
}

grpc::Status TunnelBrokerServiceImpl::BecomeNewPrimaryDevice(
    grpc::ServerContext *context,
    const tunnelbroker::NewPrimaryRequest *request,
    tunnelbroker::NewPrimaryResponse *response) {
  const std::string id = request->userid();
  const std::string deviceToken = request->devicetoken();

  std::shared_ptr<ping::ClientData> clientData =
      std::make_shared<ping::ClientData>(id, deviceToken);
  auto iterator = primaries.find(id);
  if (iterator == primaries.end()) {
    primaries.insert_or_assign(id, clientData);
    response->set_success(true);
    return grpc::Status::OK;
  }
  if (iterator->second->deviceToken == deviceToken) {
    response->set_success(true);
    return grpc::Status::OK;
  }

  if (iterator->second->lastState == ping::ClientState::ONLINE) {
    response->set_success(false);
  } else {
    primaries.insert_or_assign(id, clientData);
    response->set_success(true);
  }

  return grpc::Status::OK;
}

grpc::Status
TunnelBrokerServiceImpl::SendPong(grpc::ServerContext *context,
                                  const tunnelbroker::PongRequest *request,
                                  google::protobuf::Empty *response) {
  const std::string id = request->userid();
  const std::string deviceToken = request->devicetoken();

  auto iterator = primaries.find(id);

  if (iterator == primaries.end() ||
      iterator->second->deviceToken != deviceToken) {
    return grpc::Status::OK;
  }

  if (!iterator->second->pingRequests.isEmpty()) {
    bool value;
    iterator->second->pingRequests.blockingRead(value);
    iterator->second->pingResponses.write(true);
  }

  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
