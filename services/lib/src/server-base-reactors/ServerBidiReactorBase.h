#pragma once

#include "BaseReactor.h"
#include "ThreadPool.h"

#include <grpcpp/grpcpp.h>

#include <atomic>
#include <memory>
#include <string>
#include <thread>

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

// This is how this type of reactor works:
// - repeat:
//   - read a request from the client
//   - write a response to the client
// - terminate the connection
template <class Request, class Response>
class ServerBidiReactorBase : public grpc::ServerBidiReactor<Request, Response>,
                              public BaseReactor {
  std::shared_ptr<ReactorStatusHolder> statusHolder =
      std::make_shared<ReactorStatusHolder>();

  std::atomic<int> ongoingPoolTaskCounter{0};

  Request request;
  Response response;

  void beginPoolTask();
  void finishPoolTask();

protected:
  ServerBidiReactorStatus status;
  bool readingAborted = false;

public:
  ServerBidiReactorBase();

  // these methods come from the BaseReactor(go there for more information)
  void terminate(const grpc::Status &status) override;
  void validate() override{};
  void doneCallback() override{};
  void terminateCallback() override{};
  std::shared_ptr<ReactorStatusHolder> getStatusHolder() override;

  // these methods come from gRPC
  // https://github.com/grpc/grpc/blob/v1.39.x/include/grpcpp/impl/codegen/client_callback.h#L237
  void OnDone() override;
  void OnReadDone(bool ok) override;
  void OnWriteDone(bool ok) override;

  void terminate(ServerBidiReactorStatus status);
  ServerBidiReactorStatus getStatus() const;
  void setStatus(const ServerBidiReactorStatus &status);

  // - argument request - request that was sent by the client and received by
  // the server in the current cycle
  // - argument response - response that will be sent to the client in the
  // current cycle
  // - returns status - if the connection is about to be
  // continued, nullptr should be returned. Any other returned value will
  // terminate the connection with a given status
  virtual std::unique_ptr<ServerBidiReactorStatus>
  handleRequest(Request request, Response *response) = 0;
};

template <class Request, class Response>
ServerBidiReactorBase<Request, Response>::ServerBidiReactorBase() {
  this->statusHolder->state = ReactorState::RUNNING;
  this->StartRead(&this->request);
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  this->terminate(ServerBidiReactorStatus(status));
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::OnDone() {
  this->beginPoolTask();
  ThreadPool::getInstance().scheduleWithCallback(
      [this]() {
        this->statusHolder->state = ReactorState::DONE;
        this->doneCallback();
      },
      [this](std::unique_ptr<std::string> err) { this->finishPoolTask(); });
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::terminate(
    ServerBidiReactorStatus status) {
  this->setStatus(status);
  this->beginPoolTask();
  ThreadPool::getInstance().scheduleWithCallback(
      [this]() {
        this->terminateCallback();
        this->validate();
      },
      [this](std::unique_ptr<std::string> err) {
        if (err != nullptr) {
          this->setStatus(ServerBidiReactorStatus(
              grpc::Status(grpc::StatusCode::INTERNAL, std::string(*err))));
        }
        if (this->statusHolder->state != ReactorState::RUNNING) {
          this->finishPoolTask();
          return;
        }
        if (this->getStatus().sendLastResponse) {
          this->StartWriteAndFinish(
              &this->response, grpc::WriteOptions(), this->getStatus().status);
        } else {
          this->Finish(this->getStatus().status);
        }
        this->statusHolder->state = ReactorState::TERMINATED;
        this->finishPoolTask();
      });
}

template <class Request, class Response>
ServerBidiReactorStatus
ServerBidiReactorBase<Request, Response>::getStatus() const {
  return this->status;
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::setStatus(
    const ServerBidiReactorStatus &status) {
  this->status = status;
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
  this->beginPoolTask();
  ThreadPool::getInstance().scheduleWithCallback(
      [this]() {
        this->response = Response();
        std::unique_ptr<ServerBidiReactorStatus> status =
            this->handleRequest(this->request, &this->response);
        if (status != nullptr) {
          this->terminate(*status);
          return;
        }
        this->StartWrite(&this->response);
      },
      [this](std::unique_ptr<std::string> err) {
        if (err != nullptr) {
          this->terminate(ServerBidiReactorStatus(
              grpc::Status(grpc::StatusCode::INTERNAL, *err)));
        }
        this->finishPoolTask();
      });
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

template <class Request, class Response>
std::shared_ptr<ReactorStatusHolder>
ServerBidiReactorBase<Request, Response>::getStatusHolder() {
  return this->statusHolder;
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::beginPoolTask() {
  this->ongoingPoolTaskCounter++;
}

template <class Request, class Response>
void ServerBidiReactorBase<Request, Response>::finishPoolTask() {
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
