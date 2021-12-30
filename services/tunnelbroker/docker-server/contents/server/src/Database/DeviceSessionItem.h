#pragma once

#include "Constants.h"
#include "Item.h"
#include <string>

namespace comm {
namespace network {
namespace database {

class DeviceSessionItem : public Item {
  std::string sessionId;
  std::string deviceId;
  std::string pubKey;
  std::string notifyToken;
  std::string deviceType;
  std::string appVersion;
  std::string deviceOs;
  long long checkpointTime = 0;

  void validate() const override;

public:
  static std::string tableName;
  // Items attributes name
  static const std::string FIELD_SESSION_ID;
  static const std::string FIELD_DEVICE_ID;
  static const std::string FIELD_PUBKEY;
  static const std::string FIELD_NOTIFY_TOKEN;
  static const std::string FIELD_DEVICE_TYPE;
  static const std::string FIELD_APP_VERSION;
  static const std::string FIELD_DEVICE_OS;
  static const std::string FIELD_CHECKPOINT_TIME;

  // Getters
  std::string getPrimaryKey() const override;
  std::string getTableName() const override;
  std::string getSessionId() const;
  std::string getDeviceId() const;
  std::string getPubKey() const;
  std::string getNotifyToken() const;
  std::string getDeviceType() const;
  std::string getAppVersion() const;
  std::string getDeviceOs() const;
  long long getCheckpointTime() const;

  DeviceSessionItem() {
  }
  DeviceSessionItem(
      const std::string sessionId,
      const std::string deviceId,
      const std::string pubKey,
      const std::string notifyToken,
      const std::string deviceType,
      const std::string appVersion,
      const std::string deviceOs);
  DeviceSessionItem(const AttributeValues &itemFromDB);
  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;
};

} // namespace database
} // namespace network
} // namespace comm
