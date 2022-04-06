#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientReadReactorBase : public grpc::ClientReadReactor<Response> {
  Response response;
  grpc::Status status;
  bool done = false;
  bool initialized = false;

  void terminate(const grpc::Status &status);

public:
  Request request;
  grpc::ClientContext context;

  void start();
  void OnReadDone(bool ok) override;
  void OnDone(const grpc::Status &status) override;
  bool isDone();

  virtual std::unique_ptr<grpc::Status> readResponse(Response &response) = 0;
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  this->status = status;
  this->terminateCallback();
  if (!this->status.ok()) {
    std::cout << "error: " << this->status.error_message() << std::endl;
  }
  this->done = true;
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
    // we should suppress this as we want to have an ability to gracefully end a
    // connection on the other side. This will result in `!ok` here. I think it
    // is somehow broken and simple bool flag doesn't give us enough information
    // on what happened.
    // We should manually check if the data we received is valid
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
  this->terminate(status);
  this->doneCallback();
}

template <class Request, class Response>
bool ClientReadReactorBase<Request, Response>::isDone() {
  return this->done;
}

} // namespace reactor
} // namespace network
} // namespace comm
