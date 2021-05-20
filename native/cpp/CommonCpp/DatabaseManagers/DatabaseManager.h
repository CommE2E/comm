#pragma once

#include "DatabaseManagerInterface.h"
// TODO: includes may be conditional if we base on the preprocessor
#include "SQLiteManager.h"

namespace comm {

class DatabaseManager {
public:
  static const DatabaseManagerInterface &getInstance() {
    // TODO: conditionally create desired type of db manager
    // maybe basing on some preprocessor flag
    thread_local SQLiteManager instance;
    return instance;
  }
};

} // namespace comm
