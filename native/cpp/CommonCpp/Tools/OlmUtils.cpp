#include "OlmUtils.h"
#include "Logger.h"

#include <folly/dynamic.h>
#include <folly/json.h>

namespace comm {

std::string getSigningPublicKey(const std::string &identityKeysBlob) {
  folly::dynamic parsedKeys;
  try {
    parsedKeys = folly::parseJson(identityKeysBlob);
  } catch (const folly::json::parse_error &e) {
    std::string errorMessage{
        "parsing identity keys failed with: " + std::string(e.what())};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  if (!parsedKeys.count("ed25519") || !parsedKeys["ed25519"].isString()) {
    std::string errorMessage{
        "parsing identity keys failed: ed25519 key missing or malformed"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  return parsedKeys["ed25519"].asString();
}

} // namespace comm
