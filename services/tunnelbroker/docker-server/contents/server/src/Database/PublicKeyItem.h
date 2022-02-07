#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class PublicKeyItem : public Item {
  std::string deviceId;
  std::string publicKey;

  void validate() const override;

public:
  static const std::string FIELD_DEVICE_ID;
  static const std::string FIELD_PUBLIC_KEY;

  std::string getPrimaryKey() const override;
  std::string getTableName() const override;
  std::string getDeviceId() const;
  std::string getPublicKey() const;

  PublicKeyItem() {
  }
  PublicKeyItem(const std::string deviceId, const std::string publicKey);
  PublicKeyItem(const AttributeValues &itemFromDB);
  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;
};

} // namespace database
} // namespace network
} // namespace comm
