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
  size_t deviceType;
  std::string appVersion;
  std::string deviceOs;
  bool isOnline = false;

  void validate() const override;

public:
  static const std::string FIELD_SESSION_ID;
  static const std::string FIELD_DEVICE_ID;
  static const std::string FIELD_PUBKEY;
  static const std::string FIELD_NOTIFY_TOKEN;
  static const std::string FIELD_DEVICE_TYPE;
  static const std::string FIELD_APP_VERSION;
  static const std::string FIELD_DEVICE_OS;
  static const std::string FIELD_EXPIRE;
  static const std::string FIELD_IS_ONLINE;

  enum DeviceTypes { MOBILE = 0, WEB = 1, KEYSERVER = 2 };

  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;
  std::string getTableName() const override;
  std::string getSessionID() const;
  std::string getDeviceID() const;
  std::string getPubKey() const;
  std::string getNotifyToken() const;
  size_t getDeviceType() const;
  std::string getAppVersion() const;
  std::string getDeviceOs() const;
  bool getIsOnline() const;

  DeviceSessionItem() {
  }
  DeviceSessionItem(
      const std::string sessionID,
      const std::string deviceID,
      const std::string pubKey,
      const std::string notifyToken,
      size_t deviceType,
      const std::string appVersion,
      const std::string deviceOs);
  DeviceSessionItem(const AttributeValues &itemFromDB);
  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;
};

} // namespace database
} // namespace network
} // namespace comm
