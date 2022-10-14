#pragma once

#include "BaseReactor.h"
#include "ThreadPool.h"

#include <glog/logging.h>
#include <grpcpp/grpcpp.h>

#include <atomic>
#include <memory>
#include <string>
#include <thread>

namespace comm {
namespace network {
namespace reactor {

// This is how this type of reactor works:
// - read a request from the client
// - write N responses to the client
// - terminate the connection
template <class Request, class Response>
class ServerWriteReactorBase : public grpc::ServerWriteReactor<Response>,
                               public BaseReactor {
  std::shared_ptr<ReactorStatusHolder> statusHolder =
      std::make_shared<ReactorStatusHolder>();

  std::atomic<int> ongoingPoolTaskCounter{0};
  Response response;
  bool initialized = false;

  void nextWrite();
  void beginPoolTask();
  void finishPoolTask();

protected:
  // this is a const ref since it's not meant to be modified
  const Request &request;

public:
  ServerWriteReactorBase(const Request *request);

  // this should be called explicitly right after the reactor is created
  void start();

  // these methods come from the BaseReactor(go there for more information)
  void validate() override{};
  void doneCallback() override{};
  void terminateCallback() override{};
  std::shared_ptr<ReactorStatusHolder> getStatusHolder() override;

  // these methods come from gRPC
  // https://github.com/grpc/grpc/blob/v1.39.x/include/grpcpp/impl/codegen/client_callback.h#L237
  virtual void initialize(){};
  void OnWriteDone(bool ok) override;
  void terminate(const grpc::Status &status) override;
  void OnDone() override;

  // - argument response - should be filled with data that will be sent to the
  // client in the current cycle
  // - returns status - if the connection is about to be
  // continued, nullptr should be returned. Any other returned value will
  // terminate the connection with a given status
  virtual std::unique_ptr<grpc::Status> writeResponse(Response *response) = 0;
};

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  this->statusHolder->setStatus(status);
  this->beginPoolTask();
  ThreadPool::getInstance().scheduleWithCallback(
      [this]() {
        this->terminateCallback();
        this->validate();
      },
      [this](std::unique_ptr<std::string> err) {
        if (err != nullptr) {
          this->statusHolder->setStatus(
              grpc::Status(grpc::StatusCode::INTERNAL, *err));
        }
        if (!this->statusHolder->getStatus().ok()) {
          LOG(ERROR) << this->statusHolder->getStatus().error_message();
        }
        if (this->statusHolder->state == ReactorState::RUNNING) {
          this->Finish(this->statusHolder->getStatus());
          this->statusHolder->state = ReactorState::TERMINATED;
        }
        this->finishPoolTask();
      });
}

template <class Request, class Response>
ServerWriteReactorBase<Request, Response>::ServerWriteReactorBase(
    const Request *request)
    : request(*request) {
  // we cannot call this->start() here because it's going to call it on
  // the base class, not derived leading to the runtime error of calling
  // a pure virtual function
  // start has to be exposed as a public function and called explicitly
  // to initialize writing
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::nextWrite() {
  this->beginPoolTask();
  ThreadPool::getInstance().scheduleWithCallback(
      [this]() {
        if (!this->initialized) {
          this->initialize();
          this->initialized = true;
        }
        this->response = Response();
        std::unique_ptr<grpc::Status> status =
            this->writeResponse(&this->response);
        if (status != nullptr) {
          this->terminate(*status);
          return;
        }
        this->StartWrite(&this->response);
      },
      [this](std::unique_ptr<std::string> err) {
        if (err != nullptr) {
          this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, *err));
        }
        this->finishPoolTask();
      });
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::start() {
  this->statusHolder->state = ReactorState::RUNNING;
  this->nextWrite();
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::OnDone() {
  this->beginPoolTask();
  ThreadPool::getInstance().scheduleWithCallback(
      [this]() { this->doneCallback(); },
      [this](std::unique_ptr<std::string> err) { this->finishPoolTask(); });
}

template <class Request, class Response>
std::shared_ptr<ReactorStatusHolder>
ServerWriteReactorBase<Request, Response>::getStatusHolder() {
  return this->statusHolder;
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, "writing error"));
    return;
  }
  this->nextWrite();
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::beginPoolTask() {
  this->ongoingPoolTaskCounter++;
}

template <class Request, class Response>
void ServerWriteReactorBase<Request, Response>::finishPoolTask() {
  this->ongoingPoolTaskCounter--;
  if (!this->ongoingPoolTaskCounter.load() &&
      this->statusHolder->state == ReactorState::DONE) {
    // This looks weird but apparently it is okay to do this. More
    // information:
    // https://phab.comm.dev/D3246#87890
    delete this;
  }
}

} // namespace reactor
} // namespace network
} // namespace comm
