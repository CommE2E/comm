#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientBidiReactorBase
    : public grpc::ClientBidiReactor<Request, Response> {
  std::shared_ptr<Response> response = nullptr;
  bool terminated = false;
  bool done = false;
  bool initialized = 0;

protected:
  Request request;
  grpc::Status status = grpc::Status::OK;

public:
  grpc::ClientContext context;

  void nextWrite();
  void terminate(const grpc::Status &status);
  bool isTerminated();
  bool isDone();
  void OnWriteDone(bool ok) override;
  void OnReadDone(bool ok) override;
  void OnDone(const grpc::Status &status) override;

  virtual std::unique_ptr<grpc::Status> prepareRequest(
      Request &request,
      std::shared_ptr<Response> previousResponse) = 0;
  virtual void validate(){};
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
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
  if (!this->initialized) {
    this->StartCall();
    this->initialized = true;
  }
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::terminate(
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
  this->StartWritesDone();
  this->terminated = true;
}

template <class Request, class Response>
bool ClientBidiReactorBase<Request, Response>::isTerminated() {
  return this->terminated;
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
    // Ending a connection on the other side results in the `ok` flag being set
    // to false. It makes it impossible to detect a failure based just on the
    // flag. We should manually check if the data we received is valid
    this->terminate(grpc::Status::OK);
    return;
  }
  this->nextWrite();
}

template <class Request, class Response>
void ClientBidiReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->terminate(status);
  this->done = true;
  this->doneCallback();
}

} // namespace reactor
} // namespace network
} // namespace comm
