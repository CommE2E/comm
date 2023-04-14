#pragma once

#include <string>

namespace comm {

struct MessageStoreThread {
  std::string id;
  int start_reached;
  int64_t last_navigated_to;
  int64_t last_pruned;
};

} // namespace comm
