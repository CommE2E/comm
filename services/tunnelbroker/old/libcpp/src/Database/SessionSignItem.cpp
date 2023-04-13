#include "SessionSignItem.h"
#include "ConfigManager.h"
#include "Tools.h"

namespace comm {
namespace network {
namespace database {

const std::string SessionSignItem::FIELD_SESSION_VERIFICATION =
    "VerificationMessage";
const std::string SessionSignItem::FIELD_DEVICE_ID = "DeviceID";
const std::string SessionSignItem::FIELD_EXPIRE = "Expire";

SessionSignItem::SessionSignItem(
    const std::string sign,
    const std::string deviceID)
    : sign(sign), deviceID(deviceID) {
  this->validate();
}

SessionSignItem::SessionSignItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void SessionSignItem::validate() const {
  if (!tools::validateDeviceID(this->deviceID)) {
    throw std::runtime_error("Error: DeviceID format is wrong.");
  }
  tools::checkIfNotEmpty("sign", this->sign);
}

void SessionSignItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->sign =
        itemFromDB.at(SessionSignItem::FIELD_SESSION_VERIFICATION).GetS();
    this->deviceID = itemFromDB.at(SessionSignItem::FIELD_DEVICE_ID).GetS();
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

PrimaryKeyDescriptor SessionSignItem::getPrimaryKeyDescriptor() const {
  return PrimaryKeyDescriptor(SessionSignItem::FIELD_DEVICE_ID);
}

PrimaryKeyValue SessionSignItem::getPrimaryKeyValue() const {
  return PrimaryKeyValue(this->deviceID);
}

std::string SessionSignItem::getSign() const {
  return this->sign;
}

std::string SessionSignItem::getDeviceID() const {
  return this->deviceID;
}

} // namespace database
} // namespace network
} // namespace comm
