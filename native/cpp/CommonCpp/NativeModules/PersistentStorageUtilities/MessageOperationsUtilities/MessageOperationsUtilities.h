#pragma once

#include "../../../DatabaseManagers/DatabaseManager.h"
#include "../../../DatabaseManagers/entities/Media.h"
#include "../../../DatabaseManagers/entities/Message.h"

#include <folly/dynamic.h>
#include <string>
#include <vector>

namespace comm {
typedef MessageEntity ClientDBMessageInfo;
class MessageOperationsUtilities {
  static ClientDBMessageInfo translateRawMessageInfoToClientDBMessageInfo(
      const folly::dynamic &rawMessageInfo);
  static Media translateMediaToClientDBMediaInfo(
      const folly::dynamic &rawMediaInfo,
      const std::string &container,
      const std::string &thread);

public:
  static std::vector<ClientDBMessageInfo>
  translateStringToClientDBMessageInfos(std::string &rawMessageInfosString);
  static void storeMessageInfos(std::string &rawMessageInfosString);
};
} // namespace comm
