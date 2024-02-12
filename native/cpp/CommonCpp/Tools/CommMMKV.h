#pragma once

#include <optional>
#include <string>
#include <vector>

namespace comm {
class CommMMKV {

public:
  static void initialize();
  static void clearSensitiveData();
  static bool setString(std::string key, std::string value);
  static std::optional<std::string> getString(std::string key);

  static bool setInt(std::string key, int value);
  static std::optional<int> getInt(std::string key, int noValue);

  static std::vector<std::string> getAllKeys();
  static void removeKeys(const std::vector<std::string> &keys);
};
} // namespace comm
