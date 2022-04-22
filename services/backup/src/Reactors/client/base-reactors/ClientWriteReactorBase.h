#pragma once

#include "BaseReactor.h"

#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientWriteReactorBase : public grpc::ClientWriteReactor<Request>,
                               public BaseReactor {
  Request request;

  void nextWrite();

public:
  Response response;
  grpc::ClientContext context;

  void start();
  void OnWriteDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone(const grpc::Status &status) override;

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
  if (this->start != ReactorState::NONE) {
    return;
  }
  this->state = ReactorState::RUNNING;
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
  if (this->getStatus().ok()) {
    this->setStatus(status);
  }
  if (!this->getStatus().ok()) {
    std::cout << "error: " << this->getStatus().error_message() << std::endl;
  }
  if (this->state != ReactorState::RUNNING) {
    return;
  }
  this->terminateCallback();
  try {
    this->validate();
  } catch (std::runtime_error &e) {
    this->setStatus(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->state = ReactorState::TERMINATED;
  this->StartWritesDone();
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->state = ReactorState::DONE;
  this->terminate(status);
  this->doneCallback();
}

} // namespace reactor
} // namespace network
} // namespace comm
