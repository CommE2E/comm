#pragma once

#include "AuthenticationHandlerBase.h"

#include <string>

namespace comm {
namespace network {
namespace auth {

class WalletAuthenticationHandler : public AuthenticationHandlerBase {
  const AuthenticationType authenticationType;

public:
  WalletAuthenticationHandler(AuthenticationType authenticationType);

  backup::FullAuthenticationResponseData*
  processRequest(const backup::FullAuthenticationRequestData &request) override;
  AuthenticationType getAuthenticationType() const override;
};

} // namespace auth
} // namespace network
} // namespace comm
