#pragma once

#include <string>

namespace comm {

class Logger {
public:
  static void log(const std::string str);
};

} // namespace comm
