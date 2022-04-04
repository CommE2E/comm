#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientBidiReactorBase
    : public grpc::ClientBidiReactor<Request, Response> {
  std::shared_ptr<Response> response = std::make_shared<Response>();
  bool done = false;
  bool initialized = 0;

protected:
  Request request;
  grpc::Status status;

public:
  grpc::ClientContext context;

  void nextWrite();
  void terminate(const grpc::Status &status);
  bool isDone();
  void OnWriteDone(bool ok) override;
  void OnReadDone(bool ok) override;
  void OnDone(const grpc::Status &status) override;

  virtual std::unique_ptr<grpc::Status> prepareRequest(
      Request &request,
      std::shared_ptr<Response> previousResponse) = 0;
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::nextWrite() {
  this->request = Request();
  std::unique_ptr<grpc::Status> status =
      this->prepareRequest(this->request, this->response);
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
void ClientBidiReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  this->status = status;
  this->terminateCallback();
  if (!this->status.ok()) {
    std::cout << "error: " << this->status.error_message() << std::endl;
  }
  if (this->done) {
    return;
  }
  this->StartWritesDone();
  this->done = true;
}

template <class Request, class Response>
bool ClientBidiReactorBase<Request, Response>::isDone() {
  return this->done;
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
    // we should suppress this as we want to have an ability to gracefully end a
    // connection on the other side. This will result in `!ok` here. I think it
    // is somehow broken and simple bool flag doesn't give us enough information
    // on what happened.
    // We should manually check if the data we received is valid
    this->terminate(grpc::Status::OK);
    return;
  }
  this->nextWrite();
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->terminate(status);
  this->doneCallback();
}

} // namespace reactor
} // namespace network
} // namespace comm
