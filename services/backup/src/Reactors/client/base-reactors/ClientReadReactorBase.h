#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientReadReactorBase : public grpc::ClientReadReactor<Response> {
  Response response;
  bool done = false;
  bool terminated = false;
  bool initialized = false;

  void terminate(const grpc::Status &status);

protected:
  grpc::Status status = grpc::Status::OK;

public:
  Request request;
  grpc::ClientContext context;

  void start();
  void OnReadDone(bool ok) override;
  void OnDone(const grpc::Status &status) override;
  bool isDone();
  bool isTerminated();

  virtual std::unique_ptr<grpc::Status> readResponse(Response &response) = 0;
  virtual void validate(){};
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::terminate(
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
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::start() {
  this->StartRead(&this->response);
  if (!this->initialized) {
    this->StartCall();
    this->initialized = true;
  }
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    // Ending a connection on the other side results in the `ok` flag being set
    // to false. It makes it impossible to detect a failure based just on the
    // flag. We should manually check if the data we received is valid
    this->terminate(grpc::Status::OK);
    return;
  }
  try {
    std::unique_ptr<grpc::Status> status = this->readResponse(this->response);
    if (status != nullptr) {
      this->terminate(*status);
      return;
    }
  } catch (std::runtime_error &e) {
    this->terminate(grpc::Status(grpc::StatusCode::INTERNAL, e.what()));
  }
  this->StartRead(&this->response);
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->terminated = true;
  this->terminate(status);
  this->doneCallback();
}

template <class Request, class Response>
bool ClientReadReactorBase<Request, Response>::isDone() {
  return this->done;
}

template <class Request, class Response>
bool ClientReadReactorBase<Request, Response>::isTerminated() {
  return this->terminated;
}

} // namespace reactor
} // namespace network
} // namespace comm
