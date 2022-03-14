#pragma once

#include "../_generated/backup.pb.h"

#include <google/protobuf/message.h>

#include <string>
#include <memory>

namespace comm {
namespace network {
namespace auth {

enum class AuthenticationType {
  PAKE = 1,
  WALLET = 2,
};

class AuthenticationHandlerBase {
public:
  virtual backup::FullAuthenticationResponseData
  processRequest(const backup::FullAuthenticationRequestData &request) = 0;
  virtual AuthenticationType getAuthenticationType() const = 0;
};

} // namespace auth
} // namespace network
} // namespace comm
