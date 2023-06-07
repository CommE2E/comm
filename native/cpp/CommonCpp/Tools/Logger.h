#pragma once

#include <iostream>
#include <string>

namespace comm {

class Logger {
public:
  static void log(const std::string str);
};

// this will log on browser console
#ifdef EMSCRIPTEN
void Logger::log(const std::string str) {
  std::cout << str << std::endl;
}
#endif

} // namespace comm
