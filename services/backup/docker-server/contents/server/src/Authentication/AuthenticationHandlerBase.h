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
  SIMPLE = 3,
};

enum class AuthenticationState {
  UNKNOWN = 1,
  IN_PROGRESS = 2,
  SUCCESS = 3,
  FAIL = 4,
};

/**
 * every state resources have to be synchronized
 * the threads that will access them will be executed sequentially but we still
 * need to synchronize
 * https://stackoverflow.com/questions/22798873/visibility-in-concurrent-c-programs
 */
class AuthenticationHandlerBase {
protected:
  std::atomic<AuthenticationState> state = AuthenticationState::IN_PROGRESS;

public:
  virtual backup::FullAuthenticationResponseData *
  processRequest(const backup::FullAuthenticationRequestData &request) = 0;
  virtual AuthenticationType getAuthenticationType() const = 0;
  AuthenticationState getState() {
    return this->state;
  }

  virtual ~AuthenticationHandlerBase() = default;
};

} // namespace auth
} // namespace network
} // namespace comm
