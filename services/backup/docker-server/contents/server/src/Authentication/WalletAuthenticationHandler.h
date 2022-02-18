#pragma once

#include "AuthenticationHandlerBase.h"

#include <string>

namespace comm {
namespace network {
namespace crypto {

class WalletAuthenticationHandler : public AuthenticationHandlerBase {
public:
  std::string processRequest(const std::string &data) override;
};

} // namespace crypto
} // namespace network
} // namespace comm
