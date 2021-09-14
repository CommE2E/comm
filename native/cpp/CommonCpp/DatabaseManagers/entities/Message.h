#pragma once

#include <string>

namespace comm {

struct Message {
  std::string id;
  int thread;
  int user;
  int type;
  int future_type;
  std::string content;
  int64_t time;
};

} // namespace comm
