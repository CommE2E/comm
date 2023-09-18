#pragma once

#include <folly/Optional.h>

#include <string>

namespace comm {

class CommSecureStore {
public:
  void set(const std::string key, const std::string value) const;
  folly::Optional<std::string> get(const std::string key) const;
  const std::string commServicesAccessToken = "accessToken";
  const std::string userID = "userID";
  const std::string deviceID = "deviceID";
};

} // namespace comm
