#pragma once

#include <string>

namespace comm {

struct Message {
  int id;
  int thread;
  int user;
  int type;
  int future_type;
  std::string content;
  int time;
};

} // namespace comm
