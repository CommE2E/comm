#pragma once

#include "entities/Draft.h"

#include <jsi/jsi.h>
#include <string>

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
  virtual std::string getDraft(jsi::Runtime &rt, std::string key) const = 0;
  virtual void
  updateDraft(jsi::Runtime &rt, std::string key, std::string text) const = 0;
  virtual std::vector<Draft> getAllDrafts(jsi::Runtime &rt) const = 0;
};

} // namespace comm
