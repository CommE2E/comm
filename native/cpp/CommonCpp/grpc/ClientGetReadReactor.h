#pragma once

#include <grpcpp/grpcpp.h>

#include "_generated/tunnelbroker.grpc.pb.h"
#include "_generated/tunnelbroker.pb.h"

class ClientGetReadReactor
    : public grpc::ClientReadReactor<tunnelbroker::GetResponse> {
  grpc::ClientContext context;
  tunnelbroker::GetRequest request;
  tunnelbroker::GetResponse response;
  std::mutex onReadDoneCallbackMutex;
  std::mutex onOpenCallbackMutex;
  std::string sessionID;
  std::function<void(std::string)> onReadDoneCallback;
  std::function<void()> onOpenCallback;

public:
  ClientGetReadReactor(
      tunnelbroker::TunnelbrokerService::Stub *stub,
      std::string sessionID)
      : sessionID{sessionID}, request{} {
    request.set_sessionid(sessionID);
    stub->async()->Get(&(this->context), &(this->request), this);
    StartRead(&(this->response));
    StartCall();
  }

  void OnReadDone(bool ok) override {
    if (!ok) {
      return;
    }
    std::lock_guard<std::mutex> guard{this->onReadDoneCallbackMutex};
    if (this->onReadDoneCallback) {
      this->onReadDoneCallback(this->response.payload());
    }
    StartRead(&(this->response));
  }

  void
  setOnReadDoneCallback(std::function<void(std::string)> onReadDoneCallback) {
    std::lock_guard<std::mutex> guard{this->onReadDoneCallbackMutex};
    this->onReadDoneCallback = onReadDoneCallback;
  }

  void setOnOpenCallback(std::function<void()> onOpenCallback) {
    std::lock_guard<std::mutex> guard{this->onOpenCallbackMutex};
    this->onOpenCallback = onOpenCallback;
  }

  void tryCancel() {
    this->context.TryCancel();
  }
};
