#include "Logger.h"

#include <iostream>

namespace comm {

void Logger::log(const std::string str) {
  std::cout << str << std::endl;
}

} // namespace comm
