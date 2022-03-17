#pragma once

#include "AuthenticationHandlerBase.h"

#include "../_generated/backup.pb.h"

#include <atomic>
#include <memory>

namespace comm {
namespace network {
namespace auth {

class AuthenticationManager {
  std::unique_ptr<AuthenticationHandlerBase> authenticationHandler;

  AuthenticationType getAuthenticationTypeForRequest(
      const backup::FullAuthenticationRequestData &request) const;

public:
  AuthenticationState getState() const;
  AuthenticationType getAuthenticationType() const;
  backup::FullAuthenticationResponseData *
  processRequest(const backup::FullAuthenticationRequestData &request);
};

} // namespace auth
} // namespace network
} // namespace comm
