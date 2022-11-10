#pragma once

#include "AwsTools.h"
#include "Constants.h"
#include "DatabaseEntitiesTools.h"
#include "DatabaseManagerBase.h"
#include "DeviceSessionItem.h"
#include "MessageItem.h"
#include "PublicKeyItem.h"
#include "SessionSignItem.h"
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
#include <aws/dynamodb/model/UpdateItemRequest.h>
#include <aws/dynamodb/model/UpdateItemResult.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace database {

class DatabaseManager : public DatabaseManagerBase {
private:
  template <class T>
  T populatePutRequestFromMessageItem(T &putRequest, const MessageItem &item);

public:
  static DatabaseManager &getInstance();
  bool isTableAvailable(const std::string &tableName);

  void putSessionItem(const DeviceSessionItem &item);
  std::shared_ptr<DeviceSessionItem>
  findSessionItem(const std::string &deviceID);
  void removeSessionItem(const std::string &sessionID);
  void updateSessionItemIsOnline(const std::string &sessionID, bool isOnline);
  bool updateSessionItemDeviceToken(
      const std::string &sessionID,
      const std::string &newDeviceToken);

  void putSessionSignItem(const SessionSignItem &item);
  std::shared_ptr<SessionSignItem>
  findSessionSignItem(const std::string &deviceID);
  void removeSessionSignItem(const std::string &deviceID);

  void putPublicKeyItem(const PublicKeyItem &item);
  std::shared_ptr<PublicKeyItem> findPublicKeyItem(const std::string &deviceID);
  void removePublicKeyItem(const std::string &deviceID);

  void putMessageItem(const MessageItem &item);
  void putMessageItemsByBatch(const std::vector<MessageItem> &messageItems);
  std::shared_ptr<MessageItem>
  findMessageItem(const std::string &toDeviceID, const std::string &messageID);
  std::vector<std::shared_ptr<MessageItem>>
  findMessageItemsByReceiver(const std::string &toDeviceID);
  void removeMessageItem(
      const std::string &toDeviceID,
      const std::string &messageID);
  void removeMessageItemsByIDsForDeviceID(
      std::vector<std::string> &messageIDs,
      const std::string &toDeviceID);
};

} // namespace database
} // namespace network
} // namespace comm
