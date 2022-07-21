#include "BlobServiceImpl.h"

#include "GlobalTools.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

void RunServer() {
  std::string server_address = "0.0.0.0:50051";
  BlobServiceImpl blobService;

  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
  builder.RegisterService(&blobService);
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  LOG(INFO) << "Server listening";

  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::tools::InitLogging("blob");
  comm::network::RunServer();

  return 0;
}
