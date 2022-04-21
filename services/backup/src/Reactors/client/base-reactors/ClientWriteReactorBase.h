#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientWriteReactorBase : public grpc::ClientWriteReactor<Request> {
  grpc::Status status = grpc::Status::OK;
  bool done = false;
  bool terminated = false;
  bool initialized = 0;
  Request request;

  void nextWrite();

public:
  Response response;
  grpc::ClientContext context;

  void OnWriteDone(bool ok) override;
  void terminate(const grpc::Status &status);
  bool isDone();
  bool isTerminated();
  void OnDone(const grpc::Status &status) override;

  virtual std::unique_ptr<grpc::Status> prepareRequest(Request &request) = 0;
  virtual void validate(){};
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::nextWrite() {
  this->request = Request();
  try {
    std::unique_ptr<grpc::Status> status = this->prepareRequest(this->request);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
  } catch (std::runtime_error &e) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->StartWrite(&this->request);
  if (!this->initialized) {
    this->StartCall();
    this->initialized = true;
  }
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::start() {
  this->nextWrite();
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::OnWriteDone(bool ok) {
  if (!ok) {
    this->terminate(grpc::Status(grpc::StatusCode::UNKNOWN, "write error"));
    return;
  }
  this->nextWrite();
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  if (this->status.ok()) {
    this->status = status;
  }
  if (!this->status.ok()) {
    std::cout << "error: " << this->status.error_message() << std::endl;
  }
  if (this->terminated) {
    return;
  }
  this->terminateCallback();
  try {
    this->validate();
  } catch (std::runtime_error &e) {
    this->status = grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  this->terminated = true;
  this->StartWritesDone();
}

template <class Request, class Response>
bool ClientWriteReactorBase<Request, Response>::isDone() {
  return this->done;
}

template <class Request, class Response>
bool ClientWriteReactorBase<Request, Response>::isTerminated() {
  return this->terminated;
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->terminate(status);
  this->done = true;
  this->doneCallback();
}

} // namespace reactor
} // namespace network
} // namespace comm
