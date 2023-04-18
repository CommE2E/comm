#pragma once

#include <string>
#include <vector>

namespace comm {

class Base64 {
public:
  static std::string encode(const std::vector<uint8_t> &data);
};

} // namespace comm
