#pragma once

#include "AuthenticationHandler.h"

#include <string>

namespace comm {
namespace network {
namespace crypto {

// enum class AuthenticationState {
//   NOT_STARTED = 1,
//   IN_PROGRESS = 2,
//   FINISHED_SUCCESS = 3,
//   FINISHED_FAIL = 4,
// };

class WalletAuthenticationHandler : public AuthenticationHandler {
  // AuthenticationState state = AuthenticationState::NOT_STARTED;
public:
  std::string processRequest(const std::string &data) override;
};

} // namespace crypto
} // namespace network
} // namespace comm
