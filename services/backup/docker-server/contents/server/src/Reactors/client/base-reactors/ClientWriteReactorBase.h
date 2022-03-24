#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientWriteReactorBase : public grpc::ClientWriteReactor<Request> {
  grpc::Status status;
  bool done = false;
  bool initialized = 0;
  Request request;

public:
  Response response;
  grpc::ClientContext context;

  void nextWrite();
  void OnWriteDone(bool ok) override;
  void terminate(const grpc::Status &status);
  bool isDone();
  void OnDone(const grpc::Status &status) override;

  virtual std::unique_ptr<grpc::Status> prepareRequest(Request &request) = 0;
  virtual void doneCallback() {
  }
};

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::nextWrite() {
  this->request = Request();
  std::unique_ptr<grpc::Status> status = this->prepareRequest(this->request);
  if (status != nullptr) {
    this->terminate(*status);
    return;
  }
  this->StartWrite(&this->request);
  if (!this->initialized) {
    this->StartCall();
    this->initialized = true;
  }
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
  if (this->done) {
    return;
  }
  this->status = status;
  this->done = true;
  this->StartWritesDone();
  this->doneCallback();
}

template <class Request, class Response>
bool ClientWriteReactorBase<Request, Response>::isDone() {
  return this->done;
}

template <class Request, class Response>
void ClientWriteReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->terminate(status);
}

} // namespace reactor
} // namespace network
} // namespace comm
