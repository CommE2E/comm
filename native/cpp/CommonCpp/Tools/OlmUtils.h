#pragma once

#include <string>

namespace comm {

/**
 * Parses a OLM prekey string from JSON format
 * @param prekeyBlob JSON string with prekey
 * @return The prekey string extracted from the JSON
 * @throws std::runtime_error if parsing fails
 */
std::string parseOLMPrekey(std::string prekeyBlob);

/**
 * Extracts the ed25519 signing public key from an identity keys JSON blob
 * @param identityKeysBlob JSON string with identity keys
 * @return The ed25519 public key string
 * @throws std::runtime_error if parsing fails
 */
std::string getSigningPublicKey(const std::string &identityKeysBlob);

} // namespace comm
