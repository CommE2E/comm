#include "WalletAuthenticationHandler.h"

namespace comm {
namespace network {
namespace auth {

WalletAuthenticationHandler::WalletAuthenticationHandler(
    AuthenticationType authenticationType)
    : authenticationType(authenticationType) {
}

backup::FullAuthenticationResponseData
WalletAuthenticationHandler::processRequest(
    const backup::FullAuthenticationRequestData &request) {
  return backup::FullAuthenticationResponseData();
}

AuthenticationType WalletAuthenticationHandler::getAuthenticationType() const {
  return this->authenticationType;
}

} // namespace auth
} // namespace network
} // namespace comm
