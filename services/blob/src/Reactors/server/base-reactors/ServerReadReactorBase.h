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
  std::shared_ptr<ReactorUtility> utility;
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
  std::shared_ptr<ReactorUtility> getUtility() override;

  virtual std::unique_ptr<grpc::Status> readRequest(Request request) = 0;
};

template <class Request, class Response>
ServerReadReactorBase<Request, Response>::ServerReadReactorBase(
    Response *response)
    : response(response) {
  this->utility->state = ReactorState::RUNNING;
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
  this->utility->setStatus(status);
  try {
    this->terminateCallback();
    this->validate();
  } catch (std::runtime_error &e) {
    this->utility->setStatus(
        grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  if (!this->utility->getStatus().ok()) {
    std::cout << "error: " << this->utility->getStatus().error_message()
              << std::endl;
  }
  if (this->utility->state != ReactorState::RUNNING) {
    return;
  }
  this->Finish(this->utility->getStatus());
  this->utility->state = ReactorState::TERMINATED;
}

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::OnDone() {
  this->utility->state = ReactorState::DONE;
  this->doneCallback();
  // This looks weird but apparently it is okay to do this. More information:
  // https://phabricator.ashoat.com/D3246#87890
  delete this;
}

template <class Request, class Response>
std::shared_ptr<ReactorUtility>
ServerReadReactorBase<Request, Response>::getUtility() {
  return this->utility;
}

} // namespace reactor
} // namespace network
} // namespace comm
