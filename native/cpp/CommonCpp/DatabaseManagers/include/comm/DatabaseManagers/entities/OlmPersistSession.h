#pragma once

#include <string>

namespace comm {

struct OlmPersistSession {
  std::string target_user_id;
  std::string session_data;
};

} // namespace comm
