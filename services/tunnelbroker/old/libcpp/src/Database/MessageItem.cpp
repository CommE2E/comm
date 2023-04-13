#include "MessageItem.h"
#include "ConfigManager.h"
#include "Tools.h"

#include <vector>

namespace comm {
namespace network {
namespace database {

const std::string MessageItem::FIELD_MESSAGE_ID = "MessageID";
const std::string MessageItem::FIELD_FROM_DEVICE_ID = "FromDeviceID";
const std::string MessageItem::FIELD_TO_DEVICE_ID = "ToDeviceID";
const std::string MessageItem::FIELD_PAYLOAD = "Payload";
const std::string MessageItem::FIELD_BLOB_HASHES = "BlobHashes";
const std::string MessageItem::FIELD_EXPIRE = "Expire";
const std::string MessageItem::FIELD_CREATED_AT = "CreatedAt";

MessageItem::MessageItem(
    const std::string messageID,
    const std::string fromDeviceID,
    const std::string toDeviceID,
    const std::string payload,
    const std::string blobHashes)
    : messageID(messageID),
      fromDeviceID(fromDeviceID),
      toDeviceID(toDeviceID),
      payload(payload),
      blobHashes(blobHashes) {
  this->validate();
}

MessageItem::MessageItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void MessageItem::validate() const {
  if (!tools::validateDeviceID(this->fromDeviceID)) {
    throw std::runtime_error("Error: FromDeviceID format is wrong.");
  }
  if (!tools::validateDeviceID(this->toDeviceID)) {
    throw std::runtime_error("Error: ToDeviceID format is wrong.");
  }
  tools::checkIfNotEmpty("messageID", this->messageID);
}

void MessageItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->messageID = itemFromDB.at(MessageItem::FIELD_MESSAGE_ID).GetS();
    this->fromDeviceID =
        itemFromDB.at(MessageItem::FIELD_FROM_DEVICE_ID).GetS();
    this->toDeviceID = itemFromDB.at(MessageItem::FIELD_TO_DEVICE_ID).GetS();
    this->payload = itemFromDB.at(MessageItem::FIELD_PAYLOAD).GetS();
    this->blobHashes = itemFromDB.at(MessageItem::FIELD_BLOB_HASHES).GetS();
    this->expire = std::stoull(itemFromDB.at(MessageItem::FIELD_EXPIRE).GetS());
    this->createdAt =
        std::stoull(itemFromDB.at(MessageItem::FIELD_CREATED_AT).GetS());
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "Got an exception at MessageItem: " + std::string(e.what()));
  }
  this->validate();
}

std::string MessageItem::getTableName() const {
  return config::ConfigManager::getInstance().getParameter(
      config::ConfigManager::OPTION_DYNAMODB_MESSAGES_TABLE);
}

PrimaryKeyDescriptor MessageItem::getPrimaryKeyDescriptor() const {
  return PrimaryKeyDescriptor(
      MessageItem::FIELD_TO_DEVICE_ID, MessageItem::FIELD_MESSAGE_ID);
}

PrimaryKeyValue MessageItem::getPrimaryKeyValue() const {
  return PrimaryKeyValue(this->toDeviceID, this->messageID);
}

std::string MessageItem::getMessageID() const {
  return this->messageID;
}

std::string MessageItem::getFromDeviceID() const {
  return this->fromDeviceID;
}

std::string MessageItem::getToDeviceID() const {
  return this->toDeviceID;
}

std::string MessageItem::getPayload() const {
  return this->payload;
}

std::string MessageItem::getBlobHashes() const {
  return this->blobHashes;
}

uint64_t MessageItem::getExpire() const {
  return this->expire;
}

uint64_t MessageItem::getCreatedAt() const {
  return this->createdAt;
}

} // namespace database
} // namespace network
} // namespace comm
