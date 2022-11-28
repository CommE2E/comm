#include "DeviceSessionItem.h"
#include "ConfigManager.h"
#include "Tools.h"

#include <vector>

namespace comm {
namespace network {
namespace database {

const std::string DeviceSessionItem::FIELD_SESSION_ID = "SessionID";
const std::string DeviceSessionItem::FIELD_DEVICE_ID = "DeviceID";
const std::string DeviceSessionItem::FIELD_PUBKEY = "PubKey";
const std::string DeviceSessionItem::FIELD_NOTIFY_TOKEN = "NotifyToken";
const std::string DeviceSessionItem::FIELD_DEVICE_TYPE = "DeviceType";
const std::string DeviceSessionItem::FIELD_APP_VERSION = "AppVersion";
const std::string DeviceSessionItem::FIELD_DEVICE_OS = "DeviceOS";
const std::string DeviceSessionItem::FIELD_EXPIRE = "Expire";
const std::string DeviceSessionItem::FIELD_IS_ONLINE = "IsOnline";

DeviceSessionItem::DeviceSessionItem(
    const std::string sessionID,
    const std::string deviceID,
    const std::string pubKey,
    const std::string notifyToken,
    const size_t deviceType,
    const std::string appVersion,
    const std::string deviceOs)
    : sessionID(sessionID),
      deviceID(deviceID),
      pubKey(pubKey),
      notifyToken(notifyToken),
      deviceType(deviceType),
      appVersion(appVersion),
      deviceOs(deviceOs) {
  this->validate();
}

DeviceSessionItem::DeviceSessionItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void DeviceSessionItem::validate() const {
  if (!tools::validateSessionID(this->sessionID)) {
    throw std::runtime_error("Error: SessionID format is wrong.");
  }
  if (!tools::validateDeviceID(this->deviceID)) {
    throw std::runtime_error("Error: DeviceID format is wrong.");
  }
  tools::checkIfNotEmpty("pubKey", this->pubKey);
  tools::checkIfNotEmpty("appVersion", this->appVersion);
  tools::checkIfNotEmpty("deviceOs", this->deviceOs);
}

void DeviceSessionItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->sessionID = itemFromDB.at(DeviceSessionItem::FIELD_SESSION_ID).GetS();
    this->deviceID = itemFromDB.at(DeviceSessionItem::FIELD_DEVICE_ID).GetS();
    this->pubKey = itemFromDB.at(DeviceSessionItem::FIELD_PUBKEY).GetS();
    this->notifyToken =
        itemFromDB.at(DeviceSessionItem::FIELD_NOTIFY_TOKEN).GetS();
    this->deviceType =
        std::stoul(itemFromDB.at(DeviceSessionItem::FIELD_DEVICE_TYPE).GetS());
    this->appVersion =
        itemFromDB.at(DeviceSessionItem::FIELD_APP_VERSION).GetS();
    this->deviceOs = itemFromDB.at(DeviceSessionItem::FIELD_DEVICE_OS).GetS();
    this->isOnline =
        itemFromDB.at(DeviceSessionItem::FIELD_IS_ONLINE).GetBool();
  } catch (std::logic_error &e) {
    throw std::runtime_error(
        "Invalid device session database value " + std::string(e.what()));
  }
  this->validate();
}

std::string DeviceSessionItem::getTableName() const {
  return config::ConfigManager::getInstance().getParameter(
      config::ConfigManager::OPTION_DYNAMODB_SESSIONS_TABLE);
}

PrimaryKeyDescriptor DeviceSessionItem::getPrimaryKeyDescriptor() const {
  return PrimaryKeyDescriptor(DeviceSessionItem::FIELD_SESSION_ID);
}

PrimaryKeyValue DeviceSessionItem::getPrimaryKeyValue() const {
  return PrimaryKeyValue(this->sessionID);
}

std::string DeviceSessionItem::getSessionID() const {
  return this->sessionID;
}

std::string DeviceSessionItem::getDeviceID() const {
  return this->deviceID;
}

std::string DeviceSessionItem::getPubKey() const {
  return this->pubKey;
}

std::string DeviceSessionItem::getNotifyToken() const {
  return this->notifyToken;
}

size_t DeviceSessionItem::getDeviceType() const {
  return this->deviceType;
}

std::string DeviceSessionItem::getAppVersion() const {
  return this->appVersion;
}

std::string DeviceSessionItem::getDeviceOs() const {
  return this->deviceOs;
}

bool DeviceSessionItem::getIsOnline() const {
  return this->isOnline;
}

} // namespace database
} // namespace network
} // namespace comm
