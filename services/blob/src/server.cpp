#include "InnerServiceImpl.h"

#include "GlobalConstants.h"
#include "GlobalTools.h"

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <memory>

namespace comm {
namespace network {

void RunServer() {
  InnerServiceImpl innerService;

  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  builder.AddListeningPort(
      SERVER_LISTEN_ADDRESS, grpc::InsecureServerCredentials());
  builder.RegisterService(&innerService);
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "server listening at :" << SERVER_LISTEN_ADDRESS << std::endl;

  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::RunServer();

  return 0;
}
