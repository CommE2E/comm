#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class DeviceSessionItem : public Item {
  std::string sessionID;
  std::string deviceID;
  std::string pubKey;
  std::string notifyToken;
  std::string deviceType;
  std::string appVersion;
  std::string deviceOs;
  int64_t checkpointTime = 0;

  void validate() const override;

public:
  static const std::string FIELD_SESSION_ID;
  static const std::string FIELD_DEVICE_ID;
  static const std::string FIELD_PUBKEY;
  static const std::string FIELD_NOTIFY_TOKEN;
  static const std::string FIELD_DEVICE_TYPE;
  static const std::string FIELD_APP_VERSION;
  static const std::string FIELD_DEVICE_OS;
  static const std::string FIELD_CHECKPOINT_TIME;
  static const std::string FIELD_EXPIRE;

  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;
  std::string getTableName() const override;
  std::string getSessionID() const;
  std::string getDeviceID() const;
  std::string getPubKey() const;
  std::string getNotifyToken() const;
  std::string getDeviceType() const;
  std::string getAppVersion() const;
  std::string getDeviceOs() const;
  int64_t getCheckpointTime() const;

  DeviceSessionItem() {
  }
  DeviceSessionItem(
      const std::string sessionID,
      const std::string deviceID,
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
