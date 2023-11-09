#pragma once

#include <memory>
#include <string>

#include "NullableString.h"

namespace comm {

struct UserInfo {
  std::string id;
  std::unique_ptr<std::string> username;
  std::unique_ptr<std::string> relationship_status;
  std::unique_ptr<std::string> avatar;
};

struct UserInfoWeb {
  std::string id;
  NullableString username;
  NullableString relationship_status;
  NullableString avatar;
};

} // namespace comm
