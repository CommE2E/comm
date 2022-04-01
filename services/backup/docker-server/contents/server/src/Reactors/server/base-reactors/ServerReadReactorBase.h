#pragma once

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ServerReadReactorBase : public grpc::ServerReadReactor<Request> {
  Request request;

  void terminate(grpc::Status status);

protected:
  Response *response;
  grpc::Status status;

public:
  ServerReadReactorBase(Response *response);

  void OnDone() override;
  void OnReadDone(bool ok) override;

  virtual std::unique_ptr<grpc::Status> readRequest(Request request) = 0;
  virtual void initialize(){};
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::terminate(grpc::Status status) {
  this->terminateCallback();
  this->status = status;
  if (!this->status.ok()) {
    std::cout << "error: " << this->status.error_message() << std::endl;
  }
  this->Finish(status);
}

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
    // we should suppress this as we want to have an ability to gracefully end a
    // connection on the other side. This will result in `!ok` here. I think it
    // is somehow broken and simple bool flag doesn't give us enough information
    // on what happened.
    // We should manually check if the data we received is valid
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

} // namespace reactor
} // namespace network
} // namespace comm
