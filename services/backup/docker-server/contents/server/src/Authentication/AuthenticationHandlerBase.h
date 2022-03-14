#pragma once

#include "../_generated/backup.pb.h"

#include <google/protobuf/message.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace auth {

enum class AuthenticationType {
  PAKE = 1,
  WALLET = 2,
};

/**
 * every state resources have to be synchronized
 * the threads that will access them will be executed sequentially but we still
 * need to synchronize
 * https://stackoverflow.com/questions/22798873/visibility-in-concurrent-c-programs
 */
class AuthenticationHandlerBase {
public:
  virtual backup::FullAuthenticationResponseData*
  processRequest(const backup::FullAuthenticationRequestData &request) = 0;
  virtual AuthenticationType getAuthenticationType() const = 0;
};

} // namespace auth
} // namespace network
} // namespace comm
