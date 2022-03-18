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

  void nextWrite() {
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

  void terminate(const grpc::Status &status) {
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

  bool isDone() {
    return this->done;
  }

  void OnWriteDone(bool ok) override {
    if (this->response == nullptr) {
      this->response = std::make_shared<Response>();
    }
    this->StartRead(&(*this->response));
  }

  void OnReadDone(bool ok) override {
    if (!ok) {
      if (this->done) {
        return;
      }
      this->terminate(grpc::Status(grpc::StatusCode::UNKNOWN, "read error"));
      return;
    }
    this->nextWrite();
  }

  void OnDone(const grpc::Status &status) override {
    this->terminate(status);
  }

  virtual std::unique_ptr<grpc::Status> prepareRequest(
      Request &request,
      std::shared_ptr<Response> previousResponse) = 0;
  virtual void doneCallback(){};
};

} // namespace reactor
} // namespace network
} // namespace comm
