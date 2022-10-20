#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class SessionSignItem : public Item {
  std::string sign;
  std::string deviceID;

  void validate() const override;

public:
  static const std::string FIELD_SESSION_VERIFICATION;
  static const std::string FIELD_DEVICE_ID;
  static const std::string FIELD_EXPIRE;

  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;
  std::string getTableName() const override;
  std::string getSign() const;
  std::string getDeviceID() const;

  SessionSignItem() {
  }
  SessionSignItem(const std::string sign, const std::string deviceID);
  SessionSignItem(const AttributeValues &itemFromDB);
  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;
};

} // namespace database
} // namespace network
} // namespace comm
