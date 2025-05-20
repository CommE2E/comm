#pragma once

namespace comm {

class DBOperationBase {
public:
  virtual void execute(std::string db) = 0;
  virtual ~DBOperationBase(){};
};

} // namespace comm
