#include "Logger.h"

namespace comm {
namespace network {

void exitWithError(
    std::string moduleName,
    std::string errorMessage,
    bool willExit) {
  if (moduleName != "") {
    std::cerr << TERM_RED << "[" << moduleName << "] Error: " << errorMessage
              << TERM_RESET << std::endl;
  } else {
    std::cerr << "Error: " << errorMessage << std::endl;
  }
  if (willExit) {
    exit(1);
  }
}

void logError(std::string moduleName, std::string errorMessage) {
  exitWithError(moduleName, errorMessage, false);
}

void logInfo(std::string moduleName, std::string infoMessage) {
  if (moduleName != "") {
    std::cout << "[" << moduleName << "] " << infoMessage << std::endl;
  } else {
    std::cout << infoMessage << std::endl;
  }
}

void logDebug(
    std::string moduleName,
    std::string debugMessage,
    std::string color) {
  if (moduleName != "") {
    std::cout << color << "[Debug][" << moduleName << "] " << debugMessage
              << TERM_RESET << std::endl;
  } else {
    std::cout << color << "[Debug]" << debugMessage << TERM_RESET << std::endl;
  }
}
} // namespace network
} // namespace comm
