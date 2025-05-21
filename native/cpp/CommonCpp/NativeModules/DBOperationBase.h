#pragma once

#include "../DatabaseManagers/DatabaseIdentifier.h"

namespace comm {

class DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) = 0;
  virtual ~DBOperationBase(){};
};

} // namespace comm
