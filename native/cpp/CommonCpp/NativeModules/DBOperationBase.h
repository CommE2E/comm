#pragma once

namespace comm {

class DBOperationBase {
public:
  virtual void execute() = 0;
  virtual ~DBOperationBase(){};
};

} // namespace comm
