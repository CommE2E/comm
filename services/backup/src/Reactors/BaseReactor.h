#pragma once

#include "ReactorUtility.h"

#include <grpcpp/grpcpp.h>

#include <memory>

namespace comm {
namespace network {
namespace reactor {

class BaseReactor {
public:
  virtual std::shared_ptr<ReactorUtility> getUtility() = 0;
  virtual void terminate(const grpc::Status &status) = 0;
  virtual void validate() = 0;
  virtual void doneCallback() = 0;
  virtual void terminateCallback() = 0;
};

} // namespace reactor
} // namespace network
} // namespace comm
