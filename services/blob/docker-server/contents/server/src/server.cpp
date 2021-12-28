#include "BlobServiceImpl.h"

#include <grpcpp/grpcpp.h>

#include <iostream>
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
  std::cout << "Server listening" << std::endl;

  server->Wait();
}

} // namespace network
} // namespace comm

int main(int argc, char **argv) {
  comm::network::RunServer();

  return 0;
}
