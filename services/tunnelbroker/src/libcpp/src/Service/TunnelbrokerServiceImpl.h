#pragma once

#include <tunnelbroker.grpc.pb.h>
#include <tunnelbroker.pb.h>

#include <grpcpp/grpcpp.h>

#include <string>

namespace comm {
namespace network {

class TunnelBrokerServiceImpl final
    : public tunnelbroker::TunnelbrokerService::Service {

public:
  TunnelBrokerServiceImpl();
  virtual ~TunnelBrokerServiceImpl();

  grpc::Status SessionSignature(
      grpc::ServerContext *context,
      const tunnelbroker::SessionSignatureRequest *request,
      tunnelbroker::SessionSignatureResponse *reply) override;

  grpc::Status NewSession(
      grpc::ServerContext *context,
      const tunnelbroker::NewSessionRequest *request,
      tunnelbroker::NewSessionResponse *reply) override;

  grpc::Status Send(
      grpc::ServerContext *context,
      const tunnelbroker::SendRequest *request,
      google::protobuf::Empty *reply) override;

  grpc::Status
  Get(grpc::ServerContext *context,
      const tunnelbroker::GetRequest *request,
      grpc::ServerWriter<tunnelbroker::GetResponse> *stream) override;
};

} // namespace network
} // namespace comm
