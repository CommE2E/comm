#pragma once

#include <grpcpp/grpcpp.h>

#include <atomic>
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

class ReactorStatusHolder {
private:
  grpc::Status status = grpc::Status::OK;
  std::mutex statusAccessMutex;

public:
  std::atomic<ReactorState> state = {ReactorState::NONE};

  grpc::Status getStatus() {
    const std::unique_lock<std::mutex> lock(this->statusAccessMutex);
    return this->status;
  }
  void setStatus(const grpc::Status &status) {
    const std::unique_lock<std::mutex> lock(this->statusAccessMutex);
    this->status = status;
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
