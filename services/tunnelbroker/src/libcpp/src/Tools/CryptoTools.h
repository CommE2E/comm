#pragma once

#include <string>

namespace comm {
namespace network {
namespace crypto {

bool rsaVerifyString(
    const std::string &publicKeyBase64,
    const std::string &message,
    const std::string &signatureBase64);

} // namespace crypto
} // namespace network
} // namespace comm
