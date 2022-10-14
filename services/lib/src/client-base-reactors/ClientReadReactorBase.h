#pragma once

#include "BaseReactor.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

// This is how this type of reactor works:
// - send a request to the server
// - read N responses from the server
// - terminate the connection
template <class Request, class Response>
class ClientReadReactorBase : public grpc::ClientReadReactor<Response>,
                              public BaseReactor {
  std::shared_ptr<ReactorStatusHolder> statusHolder =
      std::make_shared<ReactorStatusHolder>();
  Response response;

public:
  Request request;
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
  void OnReadDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone(const grpc::Status &status) override;

  // - argument response - response from the server that was read during the
  // current cycle
  // - returns status - if the connection is about to be
  // continued, nullptr should be returned. Any other returned value will
  // terminate the connection with a given status
  virtual std::unique_ptr<grpc::Status> readResponse(Response &response) = 0;
};

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::start() {
  if (this->statusHolder->state != ReactorState::NONE) {
    return;
  }
  this->StartRead(&this->response);
  if (this->statusHolder->state != ReactorState::RUNNING) {
    this->StartCall();
    this->statusHolder->state = ReactorState::RUNNING;
  }
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    // Ending a connection on the other side results in the `ok` flag being set
    // to false. It makes it impossible to detect a failure based just on the
    // flag. We should manually check if the data we received is valid
    this->terminate(grpc::Status::OK);
    return;
  }
  try {
    std::unique_ptr<grpc::Status> status = this->readResponse(this->response);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
  } catch (std::runtime_error &e) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->StartRead(&this->response);
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::terminate(
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
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->statusHolder->state = ReactorState::DONE;
  this->terminate(status);
  this->doneCallback();
}

template <class Request, class Response>
std::shared_ptr<ReactorStatusHolder>
ClientReadReactorBase<Request, Response>::getStatusHolder() {
  return this->statusHolder;
}

} // namespace reactor
} // namespace network
} // namespace comm
