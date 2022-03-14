#pragma once

#include <grpcpp/grpcpp.h>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {

template <class Request, class Response>
class WriteReactorBase : public grpc::ServerWriteReactor<Response> {
  Response response;

protected:
  // this is a const ref since it's not meant to be modified
  const Request &request;

public:
  WriteReactorBase(const Request *request);

  virtual void NextWrite();
  void OnDone() override;
  void OnWriteDone(bool ok) override;

  virtual std::unique_ptr<grpc::Status> writeResponse(Response *response) = 0;
};

template <class Request, class Response>
WriteReactorBase<Request, Response>::WriteReactorBase(const Request *request)
    : request(*request) {
  // we cannot call this->NextWrite() here because it's going to call it on
  // the base class, not derived leading to the runtime error of calling
  // a pure virtual function
  // NextWrite has to be exposed as a public function and called explicitly
  // to initialize writing
}

template <class Request, class Response>
void WriteReactorBase<Request, Response>::NextWrite() {
  this->response = Response();
  std::unique_ptr<grpc::Status> status = this->writeResponse(&this->response);
  if (status != nullptr) {
    this->Finish(*status);
    return;
  }
  this->StartWrite(&this->response);
}

template <class Request, class Response>
void WriteReactorBase<Request, Response>::OnDone() {
  delete this;
}

template <class Request, class Response>
void WriteReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    this->Finish(grpc::Status(grpc::StatusCode::INTERNAL, "writing error"));
    return;
  }
  try {
    this->NextWrite();
  } catch (std::runtime_error &e) {
    this->Finish(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
}

} // namespace network
} // namespace comm
