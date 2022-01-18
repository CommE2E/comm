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

} // namespace database
} // namespace network
} // namespace comm
