#pragma once

#include "../_generated/tunnelbroker.grpc.pb.h"
#include "../_generated/tunnelbroker.pb.h"

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <string>

namespace comm {
namespace network {

class TunnelBrokerServiceImpl final
    : public tunnelbroker::TunnelbrokerService::WithCallbackMethod_OpenStream<
          grpc::Service> {

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

  grpc::ServerBidiReactor<
      tunnelbroker::OutboundMessage,
      tunnelbroker::InboundMessage> *
  OpenStream(CallbackServerContext *context) override;
};

} // namespace network
} // namespace comm
