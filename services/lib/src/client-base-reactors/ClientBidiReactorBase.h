#pragma once

#include "BaseReactor.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

// This is how this type of reactor works:
// - repeat:
//   - write a request to the server
//   - read a response from the server
// - terminate the connection
template <class Request, class Response>
class ClientBidiReactorBase : public grpc::ClientBidiReactor<Request, Response>,
                              public BaseReactor {
  std::shared_ptr<ReactorStatusHolder> statusHolder =
      std::make_shared<ReactorStatusHolder>();
  std::shared_ptr<Response> response = nullptr;
  void nextWrite();

protected:
  Request request;

public:
  grpc::ClientContext context;

  // this should be called explicitly right after the reactor is created
  void start();

  // these methods come from the BaseReactor(go there for more information)
  void validate() override{};
  void doneCallback() override{};
  void terminateCallback() override{};
  std::shared_ptr<ReactorStatusHolder> getStatusHolder() override;

  // these methods come from gRPC
  // https://github.com/grpc/grpc/blob/v1.39.x/include/grpcpp/impl/codegen/client_callback.h#L237
  void OnWriteDone(bool ok) override;
  void OnReadDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone(const grpc::Status &status) override;

  // - argument request - request that's about to be prepared for the next cycle
  // - argument previousResponse - response received during the previous cycle
  // (may be nullptr)
  // - returns status - if the connection is about to be
  // continued, nullptr should be returned. Any other returned value will
  // terminate the connection with a given status
  virtual std::unique_ptr<grpc::Status> prepareRequest(
      Request &request,
      std::shared_ptr<Response> previousResponse) = 0;
};

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::nextWrite() {
  this->request = Request();
  try {
    std::unique_ptr<grpc::Status> status =
        this->prepareRequest(this->request, this->response);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
  } catch (std::runtime_error &e) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
    return;
  }
  this->StartWrite(&this->request);
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::start() {
  if (this->statusHolder->state != ReactorState::NONE) {
    return;
  }
  this->statusHolder->state = ReactorState::RUNNING;
  this->nextWrite();
  this->StartCall();
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (this->response == nullptr) {
    this->response = std::make_shared<Response>();
  }
  this->StartRead(&(*this->response));
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    // Ending a connection on the other side results in the `ok` flag being set
    // to false. It makes it impossible to detect a failure based just on the
    // flag. We should manually check if the data we received is valid
    this->terminate(grpc::Status::OK);
    return;
  }
  this->nextWrite();
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  if (this->statusHolder->getStatus().ok()) {
    this->statusHolder->setStatus(status);
  }
  if (!this->statusHolder->getStatus().ok()) {
    LOG(ERROR) << this->statusHolder->getStatus().error_message();
  }
  if (this->statusHolder->state != ReactorState::RUNNING) {
    return;
  }
  this->terminateCallback();
  try {
    this->validate();
  } catch (std::runtime_error &e) {
    this->statusHolder->setStatus(
        grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->StartWritesDone();
  this->statusHolder->state = ReactorState::TERMINATED;
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->statusHolder->state = ReactorState::DONE;
  this->terminate(status);
  this->doneCallback();
}

template <class Request, class Response>
std::shared_ptr<ReactorStatusHolder>
ClientBidiReactorBase<Request, Response>::getStatusHolder() {
  return this->statusHolder;
}

} // namespace reactor
} // namespace network
} // namespace comm
