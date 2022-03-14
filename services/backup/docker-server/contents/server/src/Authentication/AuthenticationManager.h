#pragma once

#include "AuthenticationHandlerBase.h"

#include "../_generated/backup.pb.h"

#include <atomic>
#include <memory>

namespace comm {
namespace network {
namespace auth {

enum class AuthenticationState {
  IN_PROGRESS = 1,
  SUCCESS = 2,
  FAIL = 3,
};

class AuthenticationManager {
  std::atomic<AuthenticationState> state = AuthenticationState::IN_PROGRESS;
  std::unique_ptr<AuthenticationHandlerBase> authenticationHandler;

  AuthenticationType getAuthenticationTypeForRequest(
      const backup::FullAuthenticationRequestData &request) const;

public:
  AuthenticationState getState() const;
  backup::FullAuthenticationResponseData*
  processRequest(const backup::FullAuthenticationRequestData &request);
};

} // namespace auth
} // namespace network
} // namespace comm
