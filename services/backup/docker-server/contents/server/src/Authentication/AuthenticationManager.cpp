#include "AuthenticationManager.h"

namespace comm {
namespace network {
namespace auth {

AuthenticationState AuthenticationManager::getState() const {
  return this->state;
}

backup::FullAuthenticationResponseData AuthenticationManager::processRequest(
    const backup::FullAuthenticationRequestData &request) {
  // TODO auth logic
  // in case of any auth-specific failure, just throw runtime error
  if (request.has_pakeauthenticationrequestdata()) {
    // operations on this->pakeAuthenticationHandler which will have
    // its own state
  } else if (request.has_walletauthenticationrequestdata()) {
    // operations on this->walletAuthenticationHandler which will have
    // its own state
  }
  // mock success for now
  this->state = AuthenticationState::SUCCESS;
  return backup::FullAuthenticationResponseData();
}

} // namespace auth
} // namespace network
} // namespace comm
