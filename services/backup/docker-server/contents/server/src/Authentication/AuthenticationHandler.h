#pragma once

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

class AuthenticationHandler {
  // AuthenticationState state = AuthenticationState::NOT_STARTED;
public:
  virtual std::string processRequest(const std::string &data) = 0;
};

} // namespace crypto
} // namespace network
} // namespace comm
