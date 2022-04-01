#pragma once

#include <grpcpp/grpcpp.h>

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

struct ServerBidiReactorStatus {
  grpc::Status status;
  bool sendLastResponse;
  ServerBidiReactorStatus(
      grpc::Status status = grpc::Status::OK,
      bool sendLastResponse = false)
      : status(status), sendLastResponse(sendLastResponse) {
  }
};

template <class Request, class Response>
class ServerBidiReactorBase
    : public grpc::ServerBidiReactor<Request, Response> {
  Request request;
  Response response;

protected:
  ServerBidiReactorStatus status;
  bool readingAborted = false;

public:
  ServerBidiReactorBase();

  void OnDone() override;
  void OnReadDone(bool ok) override;
  void OnWriteDone(bool ok) override;

  void terminate(ServerBidiReactorStatus status);

  virtual std::unique_ptr<ServerBidiReactorStatus>
  handleRequest(Request request, Response *response) = 0;
  virtual void initialize(){};
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

template <class Request, class Response>
ServerBidiReactorBase<Request, Response>::ServerBidiReactorBase() {
  this->initialize();
  this->StartRead(&this->request);
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::OnDone() {
  this->doneCallback();
  delete this;
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::terminate(
    ServerBidiReactorStatus status) {
  this->terminateCallback();
  this->status = status;
  if (!this->status.status.ok()) {
    std::cout << "error: " << this->status.status.error_message() << std::endl;
  }
  if (this->status.sendLastResponse) {
    this->StartWriteAndFinish(
        &this->response, grpc::WriteOptions(), this->status.status);
  } else {
    this->Finish(this->status.status);
  }
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    this->readingAborted = true;
    // we should suppress this as we want to have an ability to gracefully end a
    // connection on the other side. This will result in `!ok` here. I think it
    // is somehow broken and simple bool flag doesn't give us enough information
    // on what happened.
    // We should manually check if the data we received is valid
    this->terminate(grpc::Status::OK);
    return;
  }
  try {
    this->response = Response();
    std::unique_ptr<ServerBidiReactorStatus> status =
        this->handleRequest(this->request, &this->response);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
    this->StartWrite(&this->response);
  } catch (std::runtime_error &e) {
    this->terminate(ServerBidiReactorStatus(
        grpc::Status(grpc::StatusCode::INTERNAL, e.what())));
  }
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    this->terminate(ServerBidiReactorStatus(
        grpc::Status(grpc::StatusCode::ABORTED, "write failed")));
    return;
  }
  this->StartRead(&this->request);
}

} // namespace reactor
} // namespace network
} // namespace comm
