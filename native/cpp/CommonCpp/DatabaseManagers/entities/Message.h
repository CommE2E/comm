#pragma once

#include <memory>
#include <string>

namespace comm {

struct Message {
  std::string id;
  std::unique_ptr<std::string> local_id;
  int thread;
  int user;
  int type;
  std::unique_ptr<int> future_type;
  std::unique_ptr<std::string> content;
  int64_t time;
};

} // namespace comm
