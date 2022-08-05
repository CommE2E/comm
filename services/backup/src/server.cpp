#include "OuterServiceImpl.h"

#include "GlobalConstants.h"
#include "GlobalTools.h"

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <memory>
#include <thread>

namespace comm {
namespace network {

void RunServer() {
  OuterServiceImpl outerService;

  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  // Listen on the given address without any authentication mechanism.
  builder.AddListeningPort(
      SERVER_LISTEN_ADDRESS, grpc::InsecureServerCredentials());
  // Register "service" as the instance through which we'll communicate with
  // clients. In this case it corresponds to an *synchronous* service.
  builder.RegisterService(&outerService);
  // Finally assemble the server.
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "server listening at :" << SERVER_LISTEN_ADDRESS << std::endl;

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
