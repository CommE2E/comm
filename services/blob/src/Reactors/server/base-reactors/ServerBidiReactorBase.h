#pragma once

#include <grpcpp/grpcpp.h>

#include <atomic>
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
  std::atomic<bool> finished = false;

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
  virtual void validate(){};
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
  // This looks weird but apparently it is okay to do this. More information:
  // https://phabricator.ashoat.com/D3246#87890
  delete this;
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::terminate(
    ServerBidiReactorStatus status) {
  this->status = status;
  try {
    this->terminateCallback();
    this->validate();
  } catch (std::runtime_error &e) {
    this->status = ServerBidiReactorStatus(
        grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  if (this->finished) {
    return;
  }
  if (this->status.sendLastResponse) {
    this->StartWriteAndFinish(
        &this->response, grpc::WriteOptions(), this->status.status);
  } else {
    this->Finish(this->status.status);
  }
  this->finished = true;
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    this->readingAborted = true;
    // Ending a connection on the other side results in the `ok` flag being set
    // to false. It makes it impossible to detect a failure based just on the
    // flag. We should manually check if the data we received is valid
    this->terminate(ServerBidiReactorStatus(grpc::Status::OK));
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
