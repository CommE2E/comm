#pragma once

#include "AuthenticationHandlerBase.h"

#include <string>

namespace comm {
namespace network {
namespace auth {

class PakeAuthenticationHandler : public AuthenticationHandlerBase {
public:
  std::string processRequest(const std::string &data) override;
};

} // namespace auth
} // namespace network
} // namespace comm
