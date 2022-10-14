#pragma once

#include "BaseReactor.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

// This is how this type of reactor works:
// - write N requests to the server
// - terminate the connection
template <class Request, class Response>
class ClientWriteReactorBase : public grpc::ClientWriteReactor<Request>,
                               public BaseReactor {
  std::shared_ptr<ReactorStatusHolder> statusHolder =
      std::make_shared<ReactorStatusHolder>();
  Request request;
  bool initialized = false;

  void nextWrite();

public:
  Response response;
  grpc::ClientContext context;

  // this should be called explicitly right after the reactor is created
  void start();

  // these methods come from the BaseReactor(go there for more information)
  void validate() override{};
  void doneCallback() override{};
  void terminateCallback() override{};
  std::shared_ptr<ReactorStatusHolder> getStatusHolder() override;

  // these methods come from gRPC
  // https://github.com/grpc/grpc/blob/v1.39.x/include/grpcpp/impl/codegen/client_callback.h#L237
  void OnWriteDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone(const grpc::Status &status) override;

  // - argument request - request that should be edited and is going to be sent
  // in the current cycle to the server
  // - returns status - if the connection is about to be
  // continued, nullptr should be returned. Any other returned value will
  // terminate the connection with a given status
  virtual std::unique_ptr<grpc::Status> prepareRequest(Request &request) = 0;
};

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::nextWrite() {
  this->request = Request();
  try {
    std::unique_ptr<grpc::Status> status = this->prepareRequest(this->request);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
  } catch (std::runtime_error &e) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->StartWrite(&this->request);
  if (!this->initialized) {
    this->StartCall();
    this->initialized = true;
  }
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::start() {
  throw std::runtime_error("this class has not been tested");
  if (this->statusHolder->state != ReactorState::NONE) {
    return;
  }
  this->statusHolder->state = ReactorState::RUNNING;
  this->nextWrite();
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    this->terminate(grpc::Status(grpc::StatusCode::UNKNOWN, "write error"));
    return;
  }
  this->nextWrite();
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  if (this->statusHolder->getStatus().ok()) {
    this->statusHolder->setStatus(status);
  }
  if (!this->statusHolder->getStatus().ok()) {
    LOG(ERROR) << this->statusHolder->getStatus().error_message();
  }
  if (this->statusHolder->state != ReactorState::RUNNING) {
    return;
  }
  this->terminateCallback();
  try {
    this->validate();
  } catch (std::runtime_error &e) {
    this->statusHolder->setStatus(
        grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->statusHolder->state = ReactorState::TERMINATED;
  this->StartWritesDone();
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->statusHolder->state = ReactorState::DONE;
  this->terminate(status);
  this->doneCallback();
}

template <class Request, class Response>
std::shared_ptr<ReactorStatusHolder>
ClientWriteReactorBase<Request, Response>::getStatusHolder() {
  return this->statusHolder;
}

} // namespace reactor
} // namespace network
} // namespace comm
