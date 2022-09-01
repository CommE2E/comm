#pragma once

#include "../NativeModules/InternalModules/SocketStatus.h"
#include <grpcpp/grpcpp.h>

#include "tunnelbroker.grpc.pb.h"
#include "tunnelbroker.pb.h"

class ClientGetReadReactor
    : public grpc::ClientReadReactor<tunnelbroker::GetResponse> {
  std::string sessionID;
  grpc::ClientContext context;
  tunnelbroker::GetRequest request;
  tunnelbroker::GetResponse response;
  std::mutex onReadDoneCallbackMutex;
  std::mutex onOpenCallbackMutex;
  std::mutex onCloseCallbackMutex;
  std::mutex setReadyStateMutex;
  std::function<void(std::string)> onReadDoneCallback;
  std::function<void()> onOpenCallback;
  std::function<void()> onCloseCallback;
  std::function<void(SocketStatus)> setReadyState;

public:
  ClientGetReadReactor(
      tunnelbroker::TunnelbrokerService::Stub *stub,
      std::string sessionID);

  void OnReadInitialMetadataDone(bool ok) override;
  void OnReadDone(bool ok) override;
  void OnDone(const grpc::Status &status) override;
  void close();

  void setOnOpenCallback(std::function<void()> onOpenCallback);
  void
  setOnReadDoneCallback(std::function<void(std::string)> onReadDoneCallback);
  void setOnCloseCallback(std::function<void()> onCloseCallback);
  void assignSetReadyStateCallback(std::function<void(SocketStatus)> callback);
};
