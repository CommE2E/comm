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
class ServerWriteReactorBase : public grpc::ServerWriteReactor<Response>,
                               public BaseReactor {
  std::shared_ptr<ReactorUtility> utility;
  Response response;
  bool initialized = false;

  void nextWrite();

protected:
  // this is a const ref since it's not meant to be modified
  const Request &request;

public:
  ServerWriteReactorBase(const Request *request);

  void start();

  void validate() override{};
  void doneCallback() override{};
  void terminateCallback() override{};

  virtual void initialize(){};
  void OnWriteDone(bool ok) override;
  void terminate(const grpc::Status &status);
  void OnDone() override;
  std::shared_ptr<ReactorUtility> getUtility() override;

  virtual std::unique_ptr<grpc::Status> writeResponse(Response *response) = 0;
};

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::terminate(
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
ServerWriteReactorBase<Request, Response>::ServerWriteReactorBase(
    const Request *request)
    : request(*request) {
  // we cannot call this->start() here because it's going to call it on
  // the base class, not derived leading to the runtime error of calling
  // a pure virtual function
  // start has to be exposed as a public function and called explicitly
  // to initialize writing
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::nextWrite() {
  try {
    if (!this->initialized) {
      this->initialize();
      this->initialized = true;
    }
    this->response = Response();
    std::unique_ptr<grpc::Status> status = this->writeResponse(&this->response);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
    this->StartWrite(&this->response);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::start() {
  this->utility->state = ReactorState::RUNNING;
  this->nextWrite();
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::OnDone() {
  this->doneCallback();
  // This looks weird but apparently it is okay to do this. More information:
  // https://phabricator.ashoat.com/D3246#87890
  delete this;
}

template <class Request, class Response>
std::shared_ptr<ReactorUtility>
ServerWriteReactorBase<Request, Response>::getUtility() {
  return this->utility;
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, "writing error"));
    return;
  }
  this->nextWrite();
}

} // namespace reactor
} // namespace network
} // namespace comm
