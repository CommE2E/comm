#pragma once

#include <grpcpp/grpcpp.h>

#include <mutex>

namespace comm {
namespace network {
namespace reactor {

enum class ReactorState {
  NONE = 0,
  RUNNING = 1,
  TERMINATED = 2,
  DONE = 3,
};

class BaseReactor {
private:
  grpc::Status status = grpc::Status::OK;
  std::mutex statusAccessMutex;
protected:
  ReactorState state = ReactorState::NONE;
public:
  grpc::Status getStatus() {
    const std::unique_lock<std::mutex> lock(this->statusAccessMutex);
    return this->status;
  }
  void setStatus(const grpc::Status &status) {
    const std::unique_lock<std::mutex> lock(this->statusAccessMutex);
    this->status = status;
  }

  ReactorState getState() const {
    return this->state;
  }

  virtual void terminate(const grpc::Status &status){};
  virtual void validate(){};
  virtual void doneCallback(){};
  virtual void terminateCallback(){};
};

} // namespace reactor
} // namespace network
} // namespace comm
