#include "InnerServiceImpl.h"

#include "GlobalConstants.h"
#include "GlobalTools.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

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
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "server listening at :" << SERVER_LISTEN_ADDRESS;

  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::tools::InitLogging("blob");
  comm::network::RunServer();

  return 0;
}
