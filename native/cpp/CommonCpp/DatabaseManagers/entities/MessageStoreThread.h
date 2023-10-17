#pragma once

#include <string>

namespace comm {

struct MessageStoreThread {
  std::string id;
  int start_reached;
};

} // namespace comm
