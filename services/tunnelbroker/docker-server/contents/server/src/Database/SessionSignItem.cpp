#include "SessionSignItem.h"
#include "ConfigManager.h"

namespace comm {
namespace network {
namespace database {

const std::string SessionSignItem::FIELD_SESSION_VERIFICATION =
    "VerificationMessage";
const std::string SessionSignItem::FIELD_DEVICE_ID = "DeviceId";
const std::string SessionSignItem::FIELD_EXPIRE = "Expire";

SessionSignItem::SessionSignItem(
    const std::string sign,
    const std::string deviceId)
    : sign(sign), deviceId(deviceId) {
  this->validate();
}

SessionSignItem::SessionSignItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void SessionSignItem::validate() const {
  if (!this->deviceId.size()) {
    throw std::runtime_error("Error: DeviceId is empty");
  }
  if (!this->sign.size()) {
    throw std::runtime_error("Error: Sign is empty");
  }
}

void SessionSignItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->sign =
        itemFromDB.at(SessionSignItem::FIELD_SESSION_VERIFICATION).GetS();
    this->deviceId = itemFromDB.at(SessionSignItem::FIELD_DEVICE_ID).GetS();
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "Got an exception at SessionSignItem: " + std::string(e.what()));
  }
  this->validate();
}

std::string SessionSignItem::getTableName() const {
  return config::ConfigManager::getInstance().getParameter(
      config::ConfigManager::OPTION_DYNAMODB_SESSIONS_VERIFICATION_TABLE);
}

std::string SessionSignItem::getPrimaryKey() const {
  return SessionSignItem::FIELD_DEVICE_ID;
}

std::string SessionSignItem::getSign() const {
  return this->sign;
}

std::string SessionSignItem::getDeviceId() const {
  return this->deviceId;
}

} // namespace database
} // namespace network
} // namespace comm
