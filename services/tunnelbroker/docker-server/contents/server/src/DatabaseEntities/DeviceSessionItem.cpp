#include "DeviceSessionItem.h"

namespace comm {
namespace network {
namespace database {

std::string DeviceSessionItem::tableName = DEVICE_SESSIONS_TABLE_NAME;
const std::string DeviceSessionItem::FIELD_SESSION_ID = "SessionId";
const std::string DeviceSessionItem::FIELD_DEVICE_ID = "LocalDeviceId";
const std::string DeviceSessionItem::FIELD_USER_ID = "UserId";
const std::string DeviceSessionItem::FIELD_NOTIFY_TOKEN = "NotifyToken";
const std::string DeviceSessionItem::FIELD_TYPE_OS = "TypeOS";
const std::string DeviceSessionItem::FIELD_CHECKPOINT_TIME = "CheckpointTime";

DeviceSessionItem::DeviceSessionItem(const AttributeValues &itemFromDB) {
  // TODO:
  // Data validation:
  // - empty strings;
  this->assignItemFromDatabase(itemFromDB);
}

void DeviceSessionItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->sessionId = itemFromDB.at(DeviceSessionItem::FIELD_SESSION_ID).GetS();
    this->localDeviceId =
        itemFromDB.at(DeviceSessionItem::FIELD_DEVICE_ID).GetS();
    this->userId = itemFromDB.at(DeviceSessionItem::FIELD_USER_ID).GetS();
    this->notifyToken =
        itemFromDB.at(DeviceSessionItem::FIELD_NOTIFY_TOKEN).GetS();
    this->typeOS = itemFromDB.at(DeviceSessionItem::FIELD_TYPE_OS).GetS();
    this->checkpointTime = std::stoll(
        std::string(
            itemFromDB.at(DeviceSessionItem::FIELD_CHECKPOINT_TIME).GetS())
            .c_str());
  } catch (std::out_of_range &e) {
    std::string errorMessage = "invalid device session database value ";
    errorMessage += e.what();
    throw std::runtime_error(errorMessage);
  }
}

std::string DeviceSessionItem::getSessionId() const {
  return DeviceSessionItem::sessionId;
}

std::string DeviceSessionItem::getLocalDeviceId() const {
  return DeviceSessionItem::localDeviceId;
}

std::string DeviceSessionItem::getUserId() const {
  return DeviceSessionItem::userId;
}

std::string DeviceSessionItem::getTableName() const {
  return DeviceSessionItem::tableName;
}

std::string DeviceSessionItem::getNotifyToken() const {
  return this->notifyToken;
}

std::string DeviceSessionItem::getTypeOS() const {
  return this->typeOS;
}

long long DeviceSessionItem::getCheckpointTime() const {
  return this->checkpointTime;
}

} // namespace database
} // namespace network
} // namespace comm
