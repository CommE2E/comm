#pragma once

#include <string>

namespace comm {

/**
 * Extracts the ed25519 signing public key from an identity keys JSON blob
 * @param identityKeysBlob JSON string with identity keys
 * @return The ed25519 public key string
 * @throws std::runtime_error if parsing fails
 */
std::string getSigningPublicKey(const std::string &identityKeysBlob);

} // namespace comm
