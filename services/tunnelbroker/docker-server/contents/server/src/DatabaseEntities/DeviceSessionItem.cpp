#include "DeviceSessionItem.h"

namespace comm {
namespace network {
namespace database {

const std::string DeviceSessionItem::ATTR_NOTIFY_TOKEN = "NotifyToken";
const std::string DeviceSessionItem::ATTR_TYPE_OS = "TypeOS";
const std::string DeviceSessionItem::ATTR_CHECKPOINT_TIME = "CheckpointTime";

DeviceSessionItem::DeviceSessionItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void DeviceSessionItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->notifyToken =
        itemFromDB.at(DeviceSessionItem::ATTR_NOTIFY_TOKEN).GetS();
    this->typeOS = itemFromDB.at(DeviceSessionItem::ATTR_TYPE_OS).GetS();
    this->checkpointTime = std::stoll(
        std::string(
            itemFromDB.at(DeviceSessionItem::ATTR_CHECKPOINT_TIME).GetS())
            .c_str());
  } catch (std::out_of_range &e) {
    std::string errorMessage = "invalid device session database value ";
    errorMessage += e.what();
    throw std::runtime_error(errorMessage);
  }
}

const std::string DeviceSessionItem::getNotifyToken() const {
  return this->notifyToken;
}

const std::string DeviceSessionItem::getTypeOS() const {
  return this->typeOS;
}

const long long DeviceSessionItem::getCheckpointTime() const {
  return this->checkpointTime;
}

} // namespace database
} // namespace network
} // namespace comm