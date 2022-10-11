#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

/**
 * Needs blobHash(pk)-index that projects:
 *  blobHash
 *  holder
 */
class ReverseIndexItem : public Item {

  std::string holder;
  std::string blobHash;

  void validate() const override;

public:
  static const std::string TABLE_NAME;
  static const std::string FIELD_HOLDER;
  static const std::string FIELD_BLOB_HASH;

  ReverseIndexItem() {
  }
  ReverseIndexItem(const std::string holder, const std::string blobHash);
  ReverseIndexItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;

  std::string getHolder() const;
  std::string getBlobHash() const;
};

} // namespace database
} // namespace network
} // namespace comm
