#include "AmqpManager.h"
#include "ConfigManager.h"
#include "GlobalTools.h"
#include "TunnelbrokerServiceImpl.h"

#include "GlobalConstants.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

#include <string>
#include <thread>

namespace comm {
namespace network {

void RunServer() {
  TunnelBrokerServiceImpl service;
  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  // Listen on the given address without any authentication mechanism.
  builder.AddListeningPort(
      SERVER_LISTEN_ADDRESS, grpc::InsecureServerCredentials());
  // Register "service" as the instance through which we'll communicate with
  // clients. In this case it corresponds to an *synchronous* service.
  builder.RegisterService(&service);
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  LOG(INFO) << "server listening at :" << SERVER_LISTEN_ADDRESS;
  // Wait for the server to shutdown. Note that some other thread must be
  // responsible for shutting down the server for this call to ever return.
  server->Wait();
}

void RunAmqpClient() {
  AmqpManager::getInstance().connect();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::tools::InitLogging("tunnelbroker");
  comm::network::config::ConfigManager::getInstance().load();
  std::thread amqpThread(comm::network::RunAmqpClient);
  std::thread grpcThread(comm::network::RunServer);
  amqpThread.join();
  grpcThread.join();
  return 0;
}
