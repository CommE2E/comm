#include "DatabaseManager.h"
#include "DynamoDBTools.h"
#include "GlobalTools.h"

#include <glog/logging.h>

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
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(item.getDeviceType())));
  request.AddItem(
      DeviceSessionItem::FIELD_APP_VERSION,
      Aws::DynamoDB::Model::AttributeValue(item.getAppVersion()));
  request.AddItem(
      DeviceSessionItem::FIELD_DEVICE_OS,
      Aws::DynamoDB::Model::AttributeValue(item.getDeviceOs()));
  request.AddItem(
      DeviceSessionItem::FIELD_EXPIRE,
      Aws::DynamoDB::Model::AttributeValue(std::to_string(
          static_cast<size_t>(std::time(0)) + SESSION_RECORD_TTL)));
  request.AddItem(
      DeviceSessionItem::FIELD_IS_ONLINE,
      Aws::DynamoDB::Model::AttributeValue().SetBool(false));
  this->innerPutItem(std::make_shared<DeviceSessionItem>(item), request);
}

std::shared_ptr<DeviceSessionItem>
DatabaseManager::findSessionItem(const std::string &sessionID) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      DeviceSessionItem::FIELD_SESSION_ID,
      Aws::DynamoDB::Model::AttributeValue(sessionID));
  return this->innerFindItem<DeviceSessionItem>(request);
}

void DatabaseManager::removeSessionItem(const std::string &sessionID) {
  std::shared_ptr<DeviceSessionItem> item = this->findSessionItem(sessionID);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

void DatabaseManager::updateSessionItemIsOnline(
    const std::string &sessionID,
    bool isOnline) {
  std::shared_ptr<DeviceSessionItem> item = this->findSessionItem(sessionID);
  if (item == nullptr) {
    LOG(ERROR) << "Can't find for update sessionItem for sessionID: "
               << sessionID;
    return;
  }
  Aws::DynamoDB::Model::UpdateItemRequest request;
  request.SetTableName(item->getTableName());

  Aws::DynamoDB::Model::AttributeValue attributeKeyValue;
  attributeKeyValue.SetS(sessionID);
  request.AddKey(DeviceSessionItem::FIELD_SESSION_ID, attributeKeyValue);
  Aws::String update_expression("SET #a = :valueA");
  request.SetUpdateExpression(update_expression);
  Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
  expressionAttributeNames["#a"] = DeviceSessionItem::FIELD_IS_ONLINE;
  request.SetExpressionAttributeNames(expressionAttributeNames);

  Aws::DynamoDB::Model::AttributeValue attributeUpdatedValue;
  attributeUpdatedValue.SetBool(isOnline);
  Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
      expressionAttributeValue;
  expressionAttributeValue[":valueA"] = attributeUpdatedValue;
  request.SetExpressionAttributeValues(expressionAttributeValue);

  const Aws::DynamoDB::Model::UpdateItemOutcome &result =
      getDynamoDBClient()->UpdateItem(request);
  if (!result.IsSuccess()) {
    LOG(ERROR) << "Error updating device online status at "
                  "`updateSessionItemIsOnline`: "
               << result.GetError().GetMessage();
  }
}

bool DatabaseManager::updateSessionItemDeviceToken(
    const std::string &sessionID,
    const std::string &newDeviceToken) {
  std::shared_ptr<DeviceSessionItem> item = this->findSessionItem(sessionID);
  if (item == nullptr) {
    LOG(ERROR) << "Can't find for update sessionItem for sessionID: "
               << sessionID;
    return false;
  }
  Aws::DynamoDB::Model::UpdateItemRequest request;
  request.SetTableName(item->getTableName());

  Aws::DynamoDB::Model::AttributeValue attributeKeyValue;
  attributeKeyValue.SetS(sessionID);
  request.AddKey(DeviceSessionItem::FIELD_SESSION_ID, attributeKeyValue);
  Aws::String update_expression("SET #a = :valueA");
  request.SetUpdateExpression(update_expression);
  Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
  expressionAttributeNames["#a"] = DeviceSessionItem::FIELD_NOTIFY_TOKEN;
  request.SetExpressionAttributeNames(expressionAttributeNames);

  Aws::DynamoDB::Model::AttributeValue attributeUpdatedValue;
  attributeUpdatedValue.SetS(newDeviceToken);
  Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
      expressionAttributeValue;
  expressionAttributeValue[":valueA"] = attributeUpdatedValue;
  request.SetExpressionAttributeValues(expressionAttributeValue);

  const Aws::DynamoDB::Model::UpdateItemOutcome &result =
      getDynamoDBClient()->UpdateItem(request);
  if (!result.IsSuccess()) {
    LOG(ERROR)
        << "Error updating device token at updateSessionItemDeviceToken: "
        << result.GetError().GetMessage();
    return false;
  }
  return true;
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
  return this->innerFindItem<SessionSignItem>(request);
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
  return this->innerFindItem<PublicKeyItem>(request);
}

void DatabaseManager::removePublicKeyItem(const std::string &deviceID) {
  std::shared_ptr<PublicKeyItem> item = this->findPublicKeyItem(deviceID);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

template <class T>
T DatabaseManager::populatePutRequestFromMessageItem(
    T &putRequest,
    const MessageItem &item) {
  putRequest.AddItem(
      MessageItem::FIELD_MESSAGE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getMessageID()));
  putRequest.AddItem(
      MessageItem::FIELD_FROM_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getFromDeviceID()));
  putRequest.AddItem(
      MessageItem::FIELD_TO_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getToDeviceID()));
  putRequest.AddItem(
      MessageItem::FIELD_PAYLOAD,
      Aws::DynamoDB::Model::AttributeValue(item.getPayload()));
  putRequest.AddItem(
      MessageItem::FIELD_BLOB_HASHES,
      Aws::DynamoDB::Model::AttributeValue(item.getBlobHashes()));
  putRequest.AddItem(
      MessageItem::FIELD_EXPIRE,
      Aws::DynamoDB::Model::AttributeValue(std::to_string(
          static_cast<size_t>(std::time(0) + MESSAGE_RECORD_TTL))));
  putRequest.AddItem(
      MessageItem::FIELD_CREATED_AT,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(tools::getCurrentTimestamp())));
  return putRequest;
}

void DatabaseManager::putMessageItem(const MessageItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request = this->populatePutRequestFromMessageItem(request, item);
  request.SetTableName(item.getTableName());
  this->innerPutItem(std::make_shared<MessageItem>(item), request);
}

void DatabaseManager::putMessageItemsByBatch(
    const std::vector<MessageItem> &messageItems) {
  std::vector<Aws::DynamoDB::Model::WriteRequest> writeRequests;
  for (MessageItem messageItem : messageItems) {
    Aws::DynamoDB::Model::PutRequest putRequest;
    putRequest =
        this->populatePutRequestFromMessageItem(putRequest, messageItem);
    Aws::DynamoDB::Model::WriteRequest writeRequest;
    writeRequest.SetPutRequest(putRequest);
    writeRequests.push_back(writeRequest);
  }
  this->innerBatchWriteItem(
      messageItems[0].getTableName(),
      DYNAMODB_MAX_BATCH_ITEMS,
      DYNAMODB_BACKOFF_FIRST_RETRY_DELAY,
      DYNAMODB_MAX_BACKOFF_TIME,
      writeRequests);
}

std::shared_ptr<MessageItem> DatabaseManager::findMessageItem(
    const std::string &toDeviceID,
    const std::string &messageID) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      MessageItem::FIELD_TO_DEVICE_ID,
      Aws::DynamoDB::Model::AttributeValue(toDeviceID));
  request.AddKey(
      MessageItem::FIELD_MESSAGE_ID,
      Aws::DynamoDB::Model::AttributeValue(messageID));
  return this->innerFindItem<MessageItem>(request);
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

void DatabaseManager::removeMessageItem(
    const std::string &toDeviceID,
    const std::string &messageID) {
  std::shared_ptr<MessageItem> item =
      this->findMessageItem(toDeviceID, messageID);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

void DatabaseManager::removeMessageItemsByIDsForDeviceID(
    std::vector<std::string> &messageIDs,
    const std::string &toDeviceID) {
  std::vector<Aws::DynamoDB::Model::WriteRequest> writeRequests;
  for (std::string &messageID : messageIDs) {
    Aws::DynamoDB::Model::DeleteRequest deleteRequest;
    deleteRequest.AddKey(
        MessageItem::FIELD_TO_DEVICE_ID,
        Aws::DynamoDB::Model::AttributeValue(toDeviceID));
    deleteRequest.AddKey(
        MessageItem::FIELD_MESSAGE_ID,
        Aws::DynamoDB::Model::AttributeValue(messageID));
    Aws::DynamoDB::Model::WriteRequest currentWriteRequest;
    currentWriteRequest.SetDeleteRequest(deleteRequest);
    writeRequests.push_back(currentWriteRequest);
  }
  this->innerBatchWriteItem(
      MessageItem().getTableName(),
      DYNAMODB_MAX_BATCH_ITEMS,
      DYNAMODB_BACKOFF_FIRST_RETRY_DELAY,
      DYNAMODB_MAX_BACKOFF_TIME,
      writeRequests);
}

} // namespace database
} // namespace network
} // namespace comm
