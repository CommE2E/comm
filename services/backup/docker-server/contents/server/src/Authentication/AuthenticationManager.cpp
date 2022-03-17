#include "AuthenticationManager.h"

#include "PakeAuthenticationHandler.h"
#include "WalletAuthenticationHandler.h"

namespace comm {
namespace network {
namespace auth {

AuthenticationState AuthenticationManager::getState() const {
  if (this->authenticationHandler == nullptr) {
    return AuthenticationState::UNKNOWN;
  }
  return this->authenticationHandler->getState();
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

AuthenticationType AuthenticationManager::getAuthenticationType() const {
  return this->authenticationHandler->getAuthenticationType();
}

backup::FullAuthenticationResponseData *AuthenticationManager::processRequest(
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

bool AuthenticationManager::performSimpleAuthentication(
    const backup::SimpleAuthenticationRequestData &authenticationData) {
  std::string userID = authenticationData.userid();
  std::string backupID = authenticationData.backupid();

  if (userID.empty() || backupID.empty()) {
    return false;
  }

  // TODO check with the DB
  // for now, mock the success
  return true;
}

} // namespace auth
} // namespace network
} // namespace comm
