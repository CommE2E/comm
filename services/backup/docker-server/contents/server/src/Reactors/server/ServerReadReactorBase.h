#pragma once

#include <grpcpp/grpcpp.h>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {

template <class Request, class Response>
class ServerReadReactorBase : public grpc::ServerReadReactor<Request> {
  Request request;

protected:
  Response *response;

public:
  ServerReadReactorBase(Response *response);

  void OnDone() override;
  void OnReadDone(bool ok) override;

  virtual std::unique_ptr<grpc::Status> readRequest(Request request) = 0;
  virtual void initialize(){};
  virtual void doneCallback(){};
};

template <class Request, class Response>
ServerReadReactorBase<Request, Response>::ServerReadReactorBase(
    Response *response)
    : response(response) {
  this->initialize();
  this->StartRead(&this->request);
}

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::OnDone() {
  this->doneCallback();
  delete this;
}

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    this->Finish(grpc::Status(grpc::StatusCode::INTERNAL, "reading error"));
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
