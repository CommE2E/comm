#pragma once

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ServerWriteReactorBase : public grpc::ServerWriteReactor<Response> {
  Response response;
  bool initialized = false;

  void terminate(grpc::Status status);

protected:
  // this is a const ref since it's not meant to be modified
  const Request &request;
  grpc::Status status;

public:
  ServerWriteReactorBase(const Request *request);

  virtual void NextWrite();
  void OnDone() override;
  void OnWriteDone(bool ok) override;

  virtual std::unique_ptr<grpc::Status> writeResponse(Response *response) = 0;
  virtual void initialize(){};
  virtual void doneCallback(){};
};

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::terminate(grpc::Status status) {
  if (!this->status.ok()) {
    std::cout << "error: " << this->status.error_message() << std::endl;
  }
  this->status = status;
  this->Finish(status);
}

template <class Request, class Response>
ServerWriteReactorBase<Request, Response>::ServerWriteReactorBase(
    const Request *request)
    : request(*request) {
  // we cannot call this->NextWrite() here because it's going to call it on
  // the base class, not derived leading to the runtime error of calling
  // a pure virtual function
  // NextWrite has to be exposed as a public function and called explicitly
  // to initialize writing
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::NextWrite() {
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
void ServerWriteReactorBase<Request, Response>::OnDone() {
  this->doneCallback();
  delete this;
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, "writing error"));
    return;
  }
  this->NextWrite();
}

} // namespace reactor
} // namespace network
} // namespace comm
