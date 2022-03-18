#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientBidiReactorBase
    : public grpc::ClientBidiReactor<Request, Response> {
  std::shared_ptr<Response> response = nullptr;
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
  virtual void doneCallback() {
  }
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
  if (this->done) {
    return;
  }
  this->StartWritesDone();
  this->status = status;
  std::cout << "DONE [code=" << status.error_code()
            << "][err=" << status.error_message() << "]" << std::endl;
  this->done = true;
  this->doneCallback();
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
    if (this->done) {
      return;
    }
    this->terminate(grpc::Status(grpc::StatusCode::UNKNOWN, "read error"));
    return;
  }
  this->nextWrite();
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->terminate(status);
}

} // namespace reactor
} // namespace network
} // namespace comm
