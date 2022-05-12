#include "DatabaseManager.h"
#include "DynamoDBTools.h"

namespace comm {
namespace network {
namespace database {

DatabaseManager &DatabaseManager::getInstance() {
  static DatabaseManager instance;
  return instance;
}

bool DatabaseManager::isTableAvailable(const std::string &tableName) {
  Aws::DynamoDB::Model::DescribeTableRequest request;
  request.SetTableName(tableName);

  // Check table availability by invoking DescribeTable
  const Aws::DynamoDB::Model::DescribeTableOutcome &result =
      getDynamoDBClient()->DescribeTable(request);
  return result.IsSuccess();
}

void DatabaseManager::putSessionItem(const DeviceSessionItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(item.getTableName());
  request.AddItem(
      DeviceSessionItem::FIELD_SESSION_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getSessionID()));
  request.AddItem(
      DeviceSessionItem::FIELD_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getDeviceID()));
  request.AddItem(
      DeviceSessionItem::FIELD_PUBKEY,
      Aws::DynamoDB::Model::AttributeValue(item.getPubKey()));
  request.AddItem(
      DeviceSessionItem::FIELD_NOTIFY_TOKEN,
      Aws::DynamoDB::Model::AttributeValue(item.getNotifyToken()));
  request.AddItem(
      DeviceSessionItem::FIELD_DEVICE_TYPE,
      Aws::DynamoDB::Model::AttributeValue(item.getDeviceType()));
  request.AddItem(
      DeviceSessionItem::FIELD_APP_VERSION,
      Aws::DynamoDB::Model::AttributeValue(item.getAppVersion()));
  request.AddItem(
      DeviceSessionItem::FIELD_DEVICE_OS,
      Aws::DynamoDB::Model::AttributeValue(item.getDeviceOs()));
  request.AddItem(
      DeviceSessionItem::FIELD_CHECKPOINT_TIME,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(item.getCheckpointTime())));
  request.AddItem(
      DeviceSessionItem::FIELD_EXPIRE,
      Aws::DynamoDB::Model::AttributeValue(std::to_string(
          static_cast<size_t>(std::time(0)) + SESSION_RECORD_TTL)));
  this->innerPutItem(std::make_shared<DeviceSessionItem>(item), request);
}

std::shared_ptr<DeviceSessionItem>
DatabaseManager::findSessionItem(const std::string &sessionID) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      DeviceSessionItem::FIELD_SESSION_ID,
      Aws::DynamoDB::Model::AttributeValue(sessionID));
  return std::move(this->innerFindItem<DeviceSessionItem>(request));
}

void DatabaseManager::removeSessionItem(const std::string &sessionID) {
  std::shared_ptr<DeviceSessionItem> item = this->findSessionItem(sessionID);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

void DatabaseManager::putSessionSignItem(const SessionSignItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(item.getTableName());
  request.AddItem(
      SessionSignItem::FIELD_SESSION_VERIFICATION,
      Aws::DynamoDB::Model::AttributeValue(item.getSign()));
  request.AddItem(
      SessionSignItem::FIELD_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getDeviceID()));
  request.AddItem(
      SessionSignItem::FIELD_EXPIRE,
      Aws::DynamoDB::Model::AttributeValue(std::to_string(
          static_cast<size_t>(std::time(0)) + SESSION_SIGN_RECORD_TTL)));
  this->innerPutItem(std::make_shared<SessionSignItem>(item), request);
}

std::shared_ptr<SessionSignItem>
DatabaseManager::findSessionSignItem(const std::string &deviceID) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      SessionSignItem::FIELD_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(deviceID));
  return std::move(this->innerFindItem<SessionSignItem>(request));
}

void DatabaseManager::removeSessionSignItem(const std::string &deviceID) {
  std::shared_ptr<SessionSignItem> item = this->findSessionSignItem(deviceID);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

void DatabaseManager::putPublicKeyItem(const PublicKeyItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(item.getTableName());
  request.AddItem(
      PublicKeyItem::FIELD_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getDeviceID()));
  request.AddItem(
      PublicKeyItem::FIELD_PUBLIC_KEY,
      Aws::DynamoDB::Model::AttributeValue(item.getPublicKey()));
  this->innerPutItem(std::make_shared<PublicKeyItem>(item), request);
}

std::shared_ptr<PublicKeyItem>
DatabaseManager::findPublicKeyItem(const std::string &deviceID) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      PublicKeyItem::FIELD_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(deviceID));
  return std::move(this->innerFindItem<PublicKeyItem>(request));
}

void DatabaseManager::removePublicKeyItem(const std::string &deviceID) {
  std::shared_ptr<PublicKeyItem> item = this->findPublicKeyItem(deviceID);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

void DatabaseManager::putMessageItem(const MessageItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(item.getTableName());
  request.AddItem(
      MessageItem::FIELD_MESSAGE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getMessageID()));
  request.AddItem(
      MessageItem::FIELD_FROM_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getFromDeviceID()));
  request.AddItem(
      MessageItem::FIELD_TO_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getToDeviceID()));
  request.AddItem(
      MessageItem::FIELD_PAYLOAD,
      Aws::DynamoDB::Model::AttributeValue(item.getPayload()));
  request.AddItem(
      MessageItem::FIELD_BLOB_HASHES,
      Aws::DynamoDB::Model::AttributeValue(item.getBlobHashes()));
  request.AddItem(
      MessageItem::FIELD_EXPIRE,
      Aws::DynamoDB::Model::AttributeValue(std::to_string(
          static_cast<size_t>(std::time(0) + MESSAGE_RECORD_TTL))));
  request.AddItem(
      MessageItem::FIELD_CREATED_AT,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(tools::getCurrentTimestamp())));
  this->innerPutItem(std::make_shared<MessageItem>(item), request);
}

std::shared_ptr<MessageItem>
DatabaseManager::findMessageItem(const std::string &messageID) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      MessageItem::FIELD_MESSAGE_ID,
      Aws::DynamoDB::Model::AttributeValue(messageID));
  return std::move(this->innerFindItem<MessageItem>(request));
}

std::vector<std::shared_ptr<MessageItem>>
DatabaseManager::findMessageItemsByReceiver(const std::string &toDeviceID) {
  std::vector<std::shared_ptr<MessageItem>> result;

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(MessageItem().getTableName());
  req.SetKeyConditionExpression(
      MessageItem::FIELD_TO_DEVICE_ID + " = :valueToMatch");

  AttributeValues attributeValues;
  attributeValues.emplace(":valueToMatch", toDeviceID);

  req.SetExpressionAttributeValues(attributeValues);
  req.SetIndexName(MessageItem::INDEX_TO_DEVICE_ID);

  const Aws::DynamoDB::Model::QueryOutcome &outcome =
      getDynamoDBClient()->Query(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Vector<AttributeValues> &items = outcome.GetResult().GetItems();
  for (auto &item : items) {
    result.push_back(std::make_shared<MessageItem>(item));
  }

  return result;
}

void DatabaseManager::removeMessageItem(const std::string &messageID) {
  std::shared_ptr<MessageItem> item = this->findMessageItem(messageID);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

} // namespace database
} // namespace network
} // namespace comm
