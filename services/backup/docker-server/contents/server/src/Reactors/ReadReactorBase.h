#pragma once

#include <grpcpp/grpcpp.h>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {

template <class Request, class Response>
class ReadReactorBase : public grpc::ServerReadReactor<Request> {
  Request request;

protected:
  Response *response;

public:
  ReadReactorBase(Response *response);

  void OnDone() override;
  void OnReadDone(bool ok) override;

  virtual std::unique_ptr<grpc::Status> readRequest(Request request) = 0;
};

template <class Request, class Response>
ReadReactorBase<Request, Response>::ReadReactorBase(Response *response)
    : response(response) {
  this->StartRead(&this->request);
}

template <class Request, class Response>
void ReadReactorBase<Request, Response>::OnDone() {
  delete this;
}

template <class Request, class Response>
void ReadReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    this->Finish(
        grpc::Status(grpc::StatusCode::INTERNAL, "OnReadDone: reading error"));
    return;
  }
  try {
    std::unique_ptr<grpc::Status> status = this->readRequest(this->request);
    if (status != nullptr) {
      this->Finish(*status);
      return;
    }
  } catch (std::runtime_error &e) {
    this->Finish(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
    return;
  }
  this->StartRead(&this->request);
}

} // namespace network
} // namespace comm
