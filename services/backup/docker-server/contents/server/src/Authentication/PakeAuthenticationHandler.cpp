#include "PakeAuthenticationHandler.h"

namespace comm {
namespace network {
namespace auth {

PakeAuthenticationHandler::PakeAuthenticationHandler(
    AuthenticationType authenticationType) : authenticationType(authenticationType) {}

backup::FullAuthenticationResponseData
PakeAuthenticationHandler::processRequest(
    const backup::FullAuthenticationRequestData &request) {
  return backup::FullAuthenticationResponseData();
}

AuthenticationType
PakeAuthenticationHandler::getAuthenticationType() const {
  return this->authenticationType;
}

} // namespace auth
} // namespace network
} // namespace comm
