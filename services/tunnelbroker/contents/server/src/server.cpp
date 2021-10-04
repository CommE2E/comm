#include <iostream>
#include <memory>
#include <string>

#include <folly/MPMCQueue.h>
#include <folly/concurrency/ConcurrentHashMap.h>
#include <folly/stop_watch.h>

#include <grpcpp/grpcpp.h>

#include <chrono>

#include "../_generated/tunnelbroker.grpc.pb.h"
#include "../_generated/tunnelbroker.pb.h"

namespace comm {
namespace network {

using namespace std::chrono_literals;

using std::size_t;

enum class ClientState {
  ONLINE,
  OFFLINE,
};

struct ClientData {
  const std::string id;
  const std::string deviceToken;

  folly::MPMCQueue<bool> pingRequests = folly::MPMCQueue<bool>(10);
  folly::MPMCQueue<bool> pingResponses = folly::MPMCQueue<bool>(10);
  ClientState lastState = ClientState::ONLINE;

  ClientData(const std::string id, const std::string deviceToken)
      : id(id), deviceToken(deviceToken) {}
};

class TunnelBrokerServiceImpl final
    : public tunnelbroker::TunnelBrokerService::Service {
public:
  folly::ConcurrentHashMap<std::string, std::shared_ptr<ClientData>> primaries;

  grpc::Status
  CheckIfPrimaryDeviceOnline(grpc::ServerContext *context,
                             const tunnelbroker::CheckRequest *request,
                             tunnelbroker::CheckResponse *response) override {
    const std::string id = request->id();
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
        iterator->second->lastState = ClientState::ONLINE;
        response->set_checkresponsetype(
            tunnelbroker::CheckResponseType::PRIMARY_ONLINE);
      } else {
        iterator->second->lastState = ClientState::OFFLINE;
        response->set_checkresponsetype(
            tunnelbroker::CheckResponseType::PRIMARY_OFFLINE);
      }
    }

    return grpc::Status::OK;
  }

  grpc::Status
  BecomeNewPrimaryDevice(grpc::ServerContext *context,
                         const tunnelbroker::NewPrimaryRequest *request,
                         tunnelbroker::NewPrimaryResponse *response) override {
    const std::string id = request->id();
    const std::string deviceToken = request->devicetoken();

    std::shared_ptr<ClientData> clientData =
        std::make_shared<ClientData>(id, deviceToken);
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

    if (iterator->second->lastState == ClientState::ONLINE) {
      response->set_success(false);
    } else {
      primaries.insert_or_assign(id, clientData);
      response->set_success(true);
    }

    return grpc::Status::OK;
  }

  grpc::Status SendPong(grpc::ServerContext *context,
                        const tunnelbroker::PongRequest *request,
                        tunnelbroker::PongResponse *response) override {
    const std::string id = request->id();
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
};

void RunServer() {
  std::string server_address = "0.0.0.0:50051";
  TunnelBrokerServiceImpl service;

  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  // Listen on the given address without any authentication mechanism.
  builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
  // Register "service" as the instance through which we'll communicate with
  // clients. In this case it corresponds to an *synchronous* service.
  builder.RegisterService(&service);
  // Finally assemble the server.
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  std::cout << "Server listening on " << server_address << std::endl;

  // Wait for the server to shutdown. Note that some other thread must be
  // responsible for shutting down the server for this call to ever return.
  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::RunServer();

  return 0;
}
