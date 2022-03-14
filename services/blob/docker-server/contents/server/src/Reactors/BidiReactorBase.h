#pragma once

#include <grpcpp/grpcpp.h>
#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {

template <class Request, class Response>
class BidiReactorBase : public grpc::ServerBidiReactor<Request, Response> {
  Request request;
  Response response;

protected:
  grpc::Status status;
  bool readingAborted = false;
  bool sendLastResponse = false;

public:
  BidiReactorBase();

  void OnDone() override;
  void OnReadDone(bool ok) override;
  void OnWriteDone(bool ok) override;

  void terminate(grpc::Status status);

  virtual std::unique_ptr<grpc::Status>
  handleRequest(Request request, Response *response) = 0;
  virtual void initialize(){};
  virtual void doneCallback(){};
};

template <class Request, class Response>
BidiReactorBase<Request, Response>::BidiReactorBase() {
  this->initialize();
  this->StartRead(&this->request);
}

template <class Request, class Response>
void BidiReactorBase<Request, Response>::OnDone() {
  this->doneCallback();
  delete this;
}

template <class Request, class Response>
void BidiReactorBase<Request, Response>::terminate(grpc::Status status) {
  this->status = status;
  if (this->sendLastResponse) {
    this->StartWriteAndFinish(&this->response, grpc::WriteOptions(), status);
  } else {
    this->Finish(status);
  }
}

template <class Request, class Response>
void BidiReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    this->readingAborted = true;
    this->terminate(grpc::Status(grpc::StatusCode::ABORTED, "no more reads"));
    return;
  }
  try {
    std::unique_ptr<grpc::Status> status =
        this->handleRequest(this->request, &this->response);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
    this->StartWrite(&this->response);
  } catch (std::runtime_error &e) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
}

template <class Request, class Response>
void BidiReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    std::cout << "Server write failed" << std::endl;
    return;
  }
  this->StartRead(&this->request);
}

} // namespace network
} // namespace comm
