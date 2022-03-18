#include <grpcpp/grpcpp.h>

#include <functional>

namespace comm {
namespace network {
namespace reactor {

template <class Request, class Response>
class ClientReadReactorBase : public grpc::ClientReadReactor<Response> {
  Response response;
  grpc::Status status;
  bool done = false;

  void terminate(const grpc::Status &status);

public:
  Request request;
  grpc::ClientContext context;

  void start();
  void OnReadDone(bool ok) override;
  void OnDone(const grpc::Status &status) override;
  bool isDone();

  virtual std::unique_ptr<grpc::Status>
  readResponse(const Response &response) = 0;
  virtual void doneCallback() {
  }
};

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::terminate(
    const grpc::Status &status) {
  if (this->done) {
    return;
  }
  this->status = status;
  std::cout << "DONE [code=" << status.error_code()
            << "][err=" << status.error_message() << "]" << std::endl;
  this->done = true;
  this->doneCallback();
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::start() {
  this->StartRead(&this->response);
  this->StartCall();
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnReadDone(bool ok) {
  if (!ok) {
    this->terminate(grpc::Status(grpc::StatusCode::UNKNOWN, "read error"));
    return;
  }
  std::unique_ptr<grpc::Status> status = this->readResponse(this->response);
  if (status != nullptr) {
    this->terminate(*status);
    return;
  }
  this->StartRead(&this->response);
}

template <class Request, class Response>
void ClientReadReactorBase<Request, Response>::OnDone(
    const grpc::Status &status) {
  this->terminate(status);
}

template <class Request, class Response>
bool ClientReadReactorBase<Request, Response>::isDone() {
  return this->done;
}

} // namespace reactor
} // namespace network
} // namespace comm
