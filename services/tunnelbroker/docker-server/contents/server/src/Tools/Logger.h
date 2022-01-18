#pragma once
#include <iostream>
#include <random>
#include <string>

namespace comm {
namespace network {

#define TERM_RESET "\033[0m"    /* Terminal color reset */
#define TERM_RED "\033[31m"     /* Red */
#define TERM_MAGENTA "\033[35m" /* Magenta */

// Prints a message to stderr and exit with code 1
// Output format is '[moduleName] errorMessage'
void exitWithError(
    std::string moduleName = "",
    std::string errorMessage = "",
    bool willExit = true);

// Prints an error message to stderr without exit
// Output format is '[moduleName] errorMessage'
void logError(std::string moduleName = "", std::string errorMessage = "");

// Prints an info message to stdout
// Output format is '[moduleName] infoMessage'
void logInfo(std::string moduleName = "", std::string infoMessage = "");

// Prints a debug message to stdout
// Output format is '[Debug][moduleName] debugMessage'
void logDebug(
    std::string moduleName = "",
    std::string debugMessage = "",
    std::string color = TERM_MAGENTA);

} // namespace network
} // namespace comm
