#include "DatabaseEntitiesTools.h"

namespace comm {
namespace network {
namespace database {

template <>
std::shared_ptr<DeviceSessionItem> createItemByType<DeviceSessionItem>() {
  return std::make_shared<DeviceSessionItem>();
}

template <>
std::shared_ptr<SessionSignItem> createItemByType<SessionSignItem>() {
  return std::make_shared<SessionSignItem>();
}

template <> std::shared_ptr<PublicKeyItem> createItemByType<PublicKeyItem>() {
  return std::make_shared<PublicKeyItem>();
}

template <> std::shared_ptr<MessageItem> createItemByType<MessageItem>() {
  return std::make_shared<MessageItem>();
}

} // namespace database
} // namespace network
} // namespace comm
