#pragma once

#include "BaseReactor.h"

#include <grpcpp/grpcpp.h>

#include <atomic>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ServerReadReactorBase : public grpc::ServerReadReactor<Request>,
                              public BaseReactor {
  std::shared_ptr<ReactorStatusHolder> statusHolder =
      std::make_shared<ReactorStatusHolder>();
  Request request;

protected:
  Response *response;

public:
  ServerReadReactorBase(Response *response);

  void validate() override{};
  void doneCallback() override{};
  void terminateCallback() override{};

  void OnReadDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone() override;
  std::shared_ptr<ReactorStatusHolder> getStatusHolder() override;

  virtual std::unique_ptr<grpc::Status> readRequest(Request request) = 0;
};

template <class Request, class Response>
ServerReadReactorBase<Request, Response>::ServerReadReactorBase(
    Response *response)
    : response(response) {
  this->statusHolder->state = ReactorState::RUNNING;
  this->StartRead(&this->request);
}

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    // Ending a connection on the other side results in the `ok` flag being set
    // to false. It makes it impossible to detect a failure based just on the
    // flag. We should manually check if the data we received is valid
    this->terminate(grpc::Status::OK);
    return;
  }
  try {
    std::unique_ptr<grpc::Status> status = this->readRequest(this->request);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
  } catch (std::runtime_error &e) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
    return;
  }
  this->StartRead(&this->request);
}

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  this->statusHolder->setStatus(status);
  try {
    this->terminateCallback();
    this->validate();
  } catch (std::runtime_error &e) {
    this->statusHolder->setStatus(
        grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  if (!this->statusHolder->getStatus().ok()) {
    std::cout << "error: " << this->statusHolder->getStatus().error_message()
              << std::endl;
  }
  if (this->statusHolder->state != ReactorState::RUNNING) {
    return;
  }
  this->Finish(this->statusHolder->getStatus());
  this->statusHolder->state = ReactorState::TERMINATED;
}

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::OnDone() {
  this->statusHolder->state = ReactorState::DONE;
  this->doneCallback();
  // This looks weird but apparently it is okay to do this. More information:
  // https://phabricator.ashoat.com/D3246#87890
  delete this;
}

template <class Request, class Response>
std::shared_ptr<ReactorStatusHolder>
ServerReadReactorBase<Request, Response>::getStatusHolder() {
  return this->statusHolder;
}

} // namespace reactor
} // namespace network
} // namespace comm
