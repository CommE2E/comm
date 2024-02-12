#pragma once

#include <optional>
#include <string>

namespace comm {
class CommMMKV {

public:
  static void initialize();
  static void clearSensitiveData();
  static bool setString(std::string key, std::string value);
  static std::optional<std::string> getString(std::string key);
};
} // namespace comm
