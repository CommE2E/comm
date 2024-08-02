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

  // MMKV API can't return null when we try to get integer that
  // doesn't exist. It allows us to set default value that is
  // returned instead in case the integer isn't present. The
  // developer should pass as `noValue` the value that they
  // know should never be set under certain key. Implementation
  // will pass `noValue` as default value and return `std::nullopt`
  // in case MMKV returns default value.
  static std::optional<int> getInt(std::string key, int noValue);

  static std::vector<std::string> getAllKeys();
  static void removeKeys(const std::vector<std::string> &keys);

  class InitFromNSEForbiddenError : public std::runtime_error {
  public:
    using std::runtime_error::runtime_error;
  };

  class ScopedCommMMKVLock {
  public:
    ScopedCommMMKVLock();
    ~ScopedCommMMKVLock();
  };
};
} // namespace comm
