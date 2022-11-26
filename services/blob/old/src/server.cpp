#include "BlobServiceImpl.h"

#include "GlobalConstants.h"
#include "GlobalTools.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

#include <memory>

namespace comm {
namespace network {

void RunServer() {
  BlobServiceImpl blobService;

  grpc::EnableDefaultHealthCheckService(true);
  grpc::ServerBuilder builder;
  builder.AddListeningPort(
      SERVER_LISTEN_ADDRESS, grpc::InsecureServerCredentials());
  builder.RegisterService(&blobService);
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  LOG(INFO) << "server listening at :" << SERVER_LISTEN_ADDRESS;

  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::tools::InitLogging("blob");
  comm::network::RunServer();

  return 0;
}
