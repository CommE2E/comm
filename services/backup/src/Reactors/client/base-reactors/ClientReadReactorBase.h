#pragma once

#include "BaseReactor.h"

#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientReadReactorBase : public grpc::ClientReadReactor<Response>,
                              public BaseReactor {
  Response response;

protected:
  grpc::Status status = grpc::Status::OK;

public:
  Request request;
  grpc::ClientContext context;

  void start();
  void OnReadDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone(const grpc::Status &status) override;

  virtual std::unique_ptr<grpc::Status> readResponse(Response &response) = 0;
};

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::start() {
  if (this->state != ReactorState::NONE) {
    return;
  }
  this->StartRead(&this->response);
  if (this->state != ReactorState::RUNNING) {
    this->StartCall();
    this->state = ReactorState::RUNNING;
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
  if (this->status.ok()) {
    this->status = status;
  }
  if (!this->status.ok()) {
    std::cout << "error: " << this->status.error_message() << std::endl;
  }
  if (this->state != ReactorState::RUNNING) {
    return;
  }
  this->terminateCallback();
  try {
    this->validate();
  } catch (std::runtime_error &e) {
    this->status = grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  this->state = ReactorState::TERMINATED;
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->state = ReactorState::DONE;
  this->terminate(status);
  this->doneCallback();
}

} // namespace reactor
} // namespace network
} // namespace comm
