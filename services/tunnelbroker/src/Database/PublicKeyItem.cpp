#include "PublicKeyItem.h"
#include "ConfigManager.h"

namespace comm {
namespace network {
namespace database {

const std::string PublicKeyItem::FIELD_DEVICE_ID = "DeviceId";
const std::string PublicKeyItem::FIELD_PUBLIC_KEY = "PublicKey";

PublicKeyItem::PublicKeyItem(
    const std::string deviceID,
    const std::string publicKey)
    : deviceID(deviceID), publicKey(publicKey) {
  this->validate();
}

PublicKeyItem::PublicKeyItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void PublicKeyItem::validate() const {
  if (!this->deviceID.size()) {
    throw std::runtime_error("Error: DeviceID is empty");
  }
  if (!this->publicKey.size()) {
    throw std::runtime_error("Error: PublicKey is empty");
  }
}

void PublicKeyItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->publicKey = itemFromDB.at(PublicKeyItem::FIELD_PUBLIC_KEY).GetS();
    this->deviceID = itemFromDB.at(PublicKeyItem::FIELD_DEVICE_ID).GetS();
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "Got an exception at PublicKeyItem: " + std::string(e.what()));
  }
  this->validate();
}

std::string PublicKeyItem::getTableName() const {
  return config::ConfigManager::getInstance().getParameter(
      config::ConfigManager::OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE);
}

std::string PublicKeyItem::getPrimaryKey() const {
  return PublicKeyItem::FIELD_DEVICE_ID;
}

std::string PublicKeyItem::getDeviceID() const {
  return this->deviceID;
}

std::string PublicKeyItem::getPublicKey() const {
  return this->publicKey;
}

} // namespace database
} // namespace network
} // namespace comm
