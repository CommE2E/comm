#include "AmqpManager.h"
#include "Constants.h"
#include "TunnelbrokerServiceImpl.h"

#include <grpcpp/grpcpp.h>
#include <boost/thread.hpp>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {

// gRPC server
void ServerRun() {
  TunnelBrokerServiceImpl service;
  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  // Listen on the given address without any authentication mechanism.
  builder.AddListeningPort(
      SERVER_LISTEN_ADDRESS, grpc::InsecureServerCredentials());
  // Register "service" as the instance through which we'll communicate with
  // clients. In this case it corresponds to an *synchronous* service.
  builder.RegisterService(&service);
  // Finally assemble the server.
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  std::cout << "[gRPC] Server listening at :" << SERVER_LISTEN_ADDRESS
            << std::endl;

  // Wait for the server to shutdown. Note that some other thread must be
  // responsible for shutting down the server for this call to ever return.
  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  boost::thread_group threads;
  threads.create_thread(comm::network::AMQPConnect);
  threads.create_thread(comm::network::ServerRun);

  // Wait for Threads to finish.
  threads.join_all();
  return 0;
}
