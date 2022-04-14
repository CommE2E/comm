#pragma once

#include <grpcpp/grpcpp.h>

#include <atomic>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ServerReadReactorBase : public grpc::ServerReadReactor<Request> {
  Request request;
  std::atomic<bool> finished = false;

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
  virtual void validate(){};
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

template <class Request, class Response>
void ServerReadReactorBase<Request, Response>::terminate(grpc::Status status) {
  this->status = status;
  try {
    this->terminateCallback();
    this->validate();
  } catch (std::runtime_error &e) {
    this->status = grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  if (!this->status.ok()) {
    std::cout << "error: " << this->status.error_message() << std::endl;
  }
  if (this->finished) {
    return;
  }
  this->Finish(this->status);
  this->finished = true;
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
  // This looks weird but apparently it is okay to do this. More information:
  // https://phabricator.ashoat.com/D3246#87890
  delete this;
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

} // namespace reactor
} // namespace network
} // namespace comm
