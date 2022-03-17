#pragma once

#include "AuthenticationHandlerBase.h"

#include <atomic>
#include <string>

namespace comm {
namespace network {
namespace auth {

enum class PakeAuthenticationState {
  REGISTRATION = 1,
  REGISTRATION_UPLOAD = 2,
  CREDENTIAL = 3,
  CREDENTIAL_FINALIZATION = 4,
  MAC_EXCHANGE = 5,
};

class PakeAuthenticationHandler : public AuthenticationHandlerBase {
  const AuthenticationType authenticationType;
  std::atomic<PakeAuthenticationState> pakeState =
      PakeAuthenticationState::REGISTRATION;

public:
  PakeAuthenticationHandler(AuthenticationType authenticationType);

  backup::FullAuthenticationResponseData *
  processRequest(const backup::FullAuthenticationRequestData &request) override;
  AuthenticationType getAuthenticationType() const override;
};

} // namespace auth
} // namespace network
} // namespace comm
