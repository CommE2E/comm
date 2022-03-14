#include "AuthenticationManager.h"

#include "PakeAuthenticationHandler.h"
#include "WalletAuthenticationHandler.h"

namespace comm {
namespace network {
namespace auth {

AuthenticationState AuthenticationManager::getState() const {
  return this->state;
}

AuthenticationType AuthenticationManager::getAuthenticationTypeForRequest(
    const backup::FullAuthenticationRequestData &request) const {
  if (request.has_pakeauthenticationrequestdata()) {
    return AuthenticationType::PAKE;
  } else if (request.has_walletauthenticationrequestdata()) {
    return AuthenticationType::WALLET;
  }
  throw std::runtime_error("invalid authentication type detected");
}

backup::FullAuthenticationResponseData* AuthenticationManager::processRequest(
    const backup::FullAuthenticationRequestData &request) {
  if (this->authenticationHandler == nullptr) {
    AuthenticationType authenticationType =
        this->getAuthenticationTypeForRequest(request);
    if (authenticationType == AuthenticationType::PAKE) {
      this->authenticationHandler =
          std::make_unique<PakeAuthenticationHandler>(authenticationType);
    } else if (authenticationType == AuthenticationType::WALLET) {
      this->authenticationHandler =
          std::make_unique<WalletAuthenticationHandler>(authenticationType);
    }
  } else if (
      this->authenticationHandler->getAuthenticationType() !=
      this->getAuthenticationTypeForRequest(request)) {
    throw std::runtime_error("inconsistent authentication detected");
  }

  return this->authenticationHandler->processRequest(request);
}

} // namespace auth
} // namespace network
} // namespace comm
