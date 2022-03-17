#include <grpcpp/grpcpp.h>

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

template <class Request, class Response>
class ClientWriteReactorBase : public grpc::ClientWriteReactor<Request> {
  grpc::Status status;
  bool done = false;
  bool initialized = 0;
  Request request;

public:
  Response response;
  grpc::ClientContext context;

  void nextWrite() {
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

  void OnWriteDone(bool ok) override {
    if (!ok) {
      this->terminate(grpc::Status(grpc::StatusCode::UNKNOWN, "write error"));
      return;
    }
    this->nextWrite();
  }

  void terminate(const grpc::Status &status) {
    if (this->done) {
      return;
    }
    this->status = status;
    std::cout << "DONE [code=" << status.error_code()
              << "][err=" << status.error_message() << "]" << std::endl;
    this->done = true;
    this->StartWritesDone();
    this->doneCallback();
  }

  bool isDone() {
    return this->done;
  }

  void OnDone(const grpc::Status &status) override {
    this->terminate(status);
  }

  virtual std::unique_ptr<grpc::Status> prepareRequest(Request &request) = 0;
  virtual void doneCallback() {
  }
};
