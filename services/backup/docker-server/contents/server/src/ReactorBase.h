#pragma once

#include <grpcpp/grpcpp.h>
#include <string>

namespace comm {
namespace network {

struct EndConnectionError : public std::exception {
  const char *what() const throw() {
    return "connection ended";
  }
};

template <class Request, class Response>
class ReactorBase : public grpc::ServerBidiReactor<Request, Response> {
  Request request;
  Response response;
  bool finished = false;

  void finish() {
    if (this->finished) {
      return;
    }
    this->finished = true;
    this->Finish(grpc::Status::OK);
  }

public:
  ReactorBase() {
    this->StartRead(&this->request);
  }

  void OnDone() override {
    GPR_ASSERT(this->finished);
    delete this;
  }

  void OnReadDone(bool ok) override {
    if (!ok) {
      this->finish();
      return;
    }
    try {
      this->response = this->handleRequest(this->request);
      this->StartWrite(&this->response);
    } catch (EndConnectionError &e) {
      this->finish();
    }
  }

  void OnWriteDone(bool ok) override {
    if (!ok) {
      gpr_log(GPR_ERROR, "Server write failed");
      return;
    }
    this->StartRead(&this->request);
  }

  virtual Response handleRequest(Request request) = 0;
};

} // namespace network
} // namespace comm
