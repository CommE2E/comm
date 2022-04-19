#pragma once

#include "AwsTools.h"
#include "Constants.h"
#include "DatabaseEntitiesTools.h"
#include "Tools.h"

#include <aws/core/Aws.h>
#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/DescribeTableRequest.h>
#include <aws/dynamodb/model/DescribeTableResult.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/PutItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace database {

class DatabaseManager {

  void innerPutItem(
      std::shared_ptr<Item> item,
      const Aws::DynamoDB::Model::PutItemRequest &request);
  template <typename T>
  std::shared_ptr<T>
  innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request);
  void innerRemoveItem(const Item &item, const std::string &key);

public:
  static DatabaseManager &getInstance();
  bool isTableAvailable(const std::string &tableName);

  void putSessionItem(const DeviceSessionItem &item);
  std::shared_ptr<DeviceSessionItem>
  findSessionItem(const std::string &deviceID);
  void removeSessionItem(const std::string &sessionID);

  void putSessionSignItem(const SessionSignItem &item);
  std::shared_ptr<SessionSignItem>
  findSessionSignItem(const std::string &deviceID);
  void removeSessionSignItem(const std::string &deviceID);

  void putPublicKeyItem(const PublicKeyItem &item);
  std::shared_ptr<PublicKeyItem> findPublicKeyItem(const std::string &deviceID);
  void removePublicKeyItem(const std::string &deviceID);

  void putMessageItem(const MessageItem &item);
  std::shared_ptr<MessageItem> findMessageItem(const std::string &messageID);
  std::vector<std::shared_ptr<MessageItem>>
  findMessageItemsByReceiver(const std::string &toDeviceID);
  void removeMessageItem(const std::string &messageID);
};

} // namespace database
} // namespace network
} // namespace comm
