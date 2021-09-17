#pragma once

#include <string>

namespace comm {

struct Media {
  std::string id;
  std::string uri;
  std::string type;
  std::string extras;
};

} // namespace comm
