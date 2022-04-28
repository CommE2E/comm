#pragma once

#include "BaseReactor.h"

#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientReadReactorBase : public grpc::ClientReadReactor<Response>,
                              public BaseReactor {
  std::shared_ptr<ReactorUtility> utility;
  Response response;

public:
  Request request;
  grpc::ClientContext context;

  void start();

  void validate() override{};
  void doneCallback() override{};
  void terminateCallback() override{};

  void OnReadDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone(const grpc::Status &status) override;
  std::shared_ptr<ReactorUtility> getUtility() override;

  virtual std::unique_ptr<grpc::Status> readResponse(Response &response) = 0;
};

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::start() {
  if (this->utility->state != ReactorState::NONE) {
    return;
  }
  this->StartRead(&this->response);
  if (this->utility->state != ReactorState::RUNNING) {
    this->StartCall();
    this->utility->state = ReactorState::RUNNING;
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
  if (this->utility->getStatus().ok()) {
    this->utility->setStatus(status);
  }
  if (!this->utility->getStatus().ok()) {
    std::cout << "error: " << this->utility->getStatus().error_message()
              << std::endl;
  }
  if (this->utility->state != ReactorState::RUNNING) {
    return;
  }
  this->terminateCallback();
  try {
    this->validate();
  } catch (std::runtime_error &e) {
    this->utility->setStatus(
        grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->utility->state = ReactorState::TERMINATED;
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->utility->state = ReactorState::DONE;
  this->terminate(status);
  this->doneCallback();
}

template <class Request, class Response>
std::shared_ptr<ReactorUtility>
ClientReadReactorBase<Request, Response>::getUtility() {
  return this->utility;
}

} // namespace reactor
} // namespace network
} // namespace comm
