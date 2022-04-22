#pragma once

#include <grpcpp/grpcpp.h>

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
protected:
  ReactorState state = ReactorState::NONE;
public:
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
