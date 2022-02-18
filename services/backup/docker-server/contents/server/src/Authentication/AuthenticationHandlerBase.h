#pragma once

#include <string>

namespace comm {
namespace network {
namespace crypto {

class AuthenticationHandlerBase {
public:
  /**
   * this function should be called repeatedly, it receives data from client
   * and returns what should be sent back to the client
   * once an empty string is returned we should verify the state
   */
  virtual std::string processRequest(const std::string &data) = 0;
};

} // namespace crypto
} // namespace network
} // namespace comm
