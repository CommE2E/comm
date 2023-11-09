#pragma once

#include <memory>
#include <string>

namespace comm {

struct UserInfo {
  std::string id;
  std::unique_ptr<std::string> username;
  std::unique_ptr<std::string> relationship_status;
  std::unique_ptr<std::string> avatar;
};

} // namespace comm
