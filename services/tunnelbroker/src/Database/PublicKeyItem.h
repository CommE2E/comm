#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class PublicKeyItem : public Item {
  std::string deviceID;
  std::string publicKey;

  void validate() const override;

public:
  static const std::string FIELD_DEVICE_ID;
  static const std::string FIELD_PUBLIC_KEY;

  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;
  std::string getTableName() const override;
  std::string getDeviceID() const;
  std::string getPublicKey() const;

  PublicKeyItem() {
  }
  PublicKeyItem(const std::string deviceID, const std::string publicKey);
  PublicKeyItem(const AttributeValues &itemFromDB);
  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;
};

} // namespace database
} // namespace network
} // namespace comm
