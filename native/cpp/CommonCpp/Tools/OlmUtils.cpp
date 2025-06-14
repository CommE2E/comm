#include "OlmUtils.h"
#include "Logger.h"

#include <folly/dynamic.h>
#include <folly/json.h>

namespace comm {

std::string parseOLMPrekey(std::string prekeyBlob) {
  folly::dynamic parsedPrekey;
  try {
    parsedPrekey = folly::parseJson(prekeyBlob);
  } catch (const folly::json::parse_error &e) {
    std::string errorMessage{
        "parsing prekey failed with: " + std::string(e.what())};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  folly::dynamic innerObject = parsedPrekey["curve25519"];
  if (!innerObject.isObject()) {
    std::string errorMessage{"parsing prekey failed: inner object malformed"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  if (innerObject.values().begin() == innerObject.values().end()) {
    std::string errorMessage{"parsing prekey failed: prekey missing"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  return parsedPrekey["curve25519"].values().begin()->asString();
}

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
