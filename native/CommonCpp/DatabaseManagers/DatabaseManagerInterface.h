#pragma once

#include <string>
#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

/**
 * if any initialization/cleaning up steps are required for specific 
 * database managers they should appear in constructors/destructors
 * following the RAII pattern
 * The runtime should also be passed in a constructor and held as a class member
 */
class DatabaseManagerInterface {
public:
  virtual std::string getDraft(
    jsi::Runtime &rt,
    std::string threadID
  ) const = 0;
  virtual void updateDraft(
    jsi::Runtime &rt,
    std::string threadID,
    std::string text
  ) const = 0;
};

} // namespace comm
