#pragma once

#include <string>
#include <string_view>
#include <vector>

namespace comm {

class Base64 {
public:
  static std::string encode(const std::vector<uint8_t> &data);
  static std::vector<uint8_t> decode(const std::string_view base64String);
};

} // namespace comm
