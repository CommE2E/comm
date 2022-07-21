#include "BackupServiceImpl.h"

#include "GlobalTools.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

void RunServer() {
  std::string server_address = "0.0.0.0:50051";
  BackupServiceImpl backupService;

  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  // Listen on the given address without any authentication mechanism.
  builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
  // Register "service" as the instance through which we'll communicate with
  // clients. In this case it corresponds to an *synchronous* service.
  builder.RegisterService(&backupService);
  // Finally assemble the server.
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  LOG(INFO) << "Server listening";

  // Wait for the server to shutdown. Note that some other thread must be
  // responsible for shutting down the server for this call to ever return.
  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::tools::InitLogging("backup");
  comm::network::RunServer();

  return 0;
}
