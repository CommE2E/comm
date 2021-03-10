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
  // to be removed
  virtual std::string getDraft(jsi::Runtime &rt) const = 0;
};

} // namespace comm
